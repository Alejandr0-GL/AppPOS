using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using AppPOS.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasesController : ControllerBase
    {
        private readonly AppPosDbContext _context;
        private readonly IStockService _stockService;

        public PurchasesController(AppPosDbContext context, IStockService stockService)
        {
            _context = context;
            _stockService = stockService;
        }

        // GET: api/Purchases?sectionId=1&startDate=2026-10-01&endDate=2026-10-31
        [HttpGet]
        public async Task<IActionResult> GetPurchases(
            [FromQuery] int? sectionId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var query = _context.Purchases.AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(purchase => purchase.Date >= startDate.Value.Date);
            }

            if (endDate.HasValue)
            {
                var exclusiveEndDate = endDate.Value.Date.AddDays(1);
                query = query.Where(purchase => purchase.Date < exclusiveEndDate);
            }

            if (sectionId.HasValue)
            {
                query = query.Where(purchase =>
                    purchase.PurchaseDetails.Any(detail => detail.SectionId == sectionId.Value));
            }

            var purchases = await query
                .Include(purchase => purchase.Supplier)
                .Include(purchase => purchase.PurchaseDetails)
                    .ThenInclude(detail => detail.Product)
                .Include(purchase => purchase.PurchaseDetails)
                    .ThenInclude(detail => detail.Section)
                .OrderByDescending(purchase => purchase.Date)
                .ToListAsync();

            var userIds = purchases.Select(purchase => purchase.UserId).Distinct().ToList();
            var users = await _context.Users
                .Where(user => userIds.Contains(user.UserId))
                .Select(user => new { user.UserId, user.Username })
                .ToDictionaryAsync(user => user.UserId);

            var result = purchases.Select(purchase => new
            {
                purchase.PurchaseId,
                purchase.SupplierId,
                purchase.UserId,
                purchase.Date,
                purchase.InvoiceNumber,
                purchase.Observations,
                purchase.Status,
                purchase.TotalAmount,
                Supplier = purchase.Supplier == null
                    ? null
                    : new { purchase.Supplier.SupplierId, purchase.Supplier.Name },
                User = users.TryGetValue(purchase.UserId, out var user)
                    ? new { user.UserId, user.Username }
                    : null,
                Details = purchase.PurchaseDetails
                    .OrderBy(detail => detail.PurchaseDetailId)
                    .Select(detail => new
                    {
                        detail.PurchaseDetailId,
                        detail.ProductId,
                        detail.SectionId,
                        detail.Quantity,
                        detail.PurchasePrice,
                        detail.Subtotal,
                        Product = detail.Product == null
                            ? null
                            : new { detail.Product.ProductId, detail.Product.Sku, detail.Product.Barcode, detail.Product.Name },
                        Section = detail.Section == null
                            ? null
                            : new { detail.Section.SectionId, detail.Section.Name }
                    })
                    .ToList(),
                Sections = purchase.PurchaseDetails
                    .Where(detail => detail.Section != null)
                    .Select(detail => new { detail.Section!.SectionId, detail.Section.Name })
                    .Distinct()
                    .ToList()
            });

            return Ok(result);
        }

        // POST: api/Purchases
        [HttpPost]
        public async Task<IActionResult> CreatePurchase([FromBody] CreatePurchaseDto dto)
        {
            var validationError = await ValidatePurchase(dto);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var purchase = new Purchase
                {
                    UserId = dto.UserId,
                    SupplierId = dto.SupplierId,
                    Date = DateTime.Now,
                    InvoiceNumber = string.IsNullOrWhiteSpace(dto.InvoiceNumber) ? null : dto.InvoiceNumber.Trim(),
                    Observations = string.IsNullOrWhiteSpace(dto.Observations) ? null : dto.Observations.Trim(),
                    Status = "COMPLETED",
                    TotalAmount = 0m
                };

                foreach (var item in dto.Details)
                {
                    var subtotal = item.Quantity * item.PurchasePrice;
                    purchase.TotalAmount += subtotal;
                    purchase.PurchaseDetails.Add(new PurchaseDetail
                    {
                        ProductId = item.ProductId,
                        SectionId = dto.SectionId,
                        Quantity = item.Quantity,
                        PurchasePrice = item.PurchasePrice,
                        Subtotal = subtotal
                    });
                }

                // 1. Cabecera + detalles
                _context.Purchases.Add(purchase);
                await _context.SaveChangesAsync(); // Genera purchase_id

                // 2, 3 y 4. Costo del producto + Inventories + StockMovements (PURCHASE)
                foreach (var detail in purchase.PurchaseDetails)
                {
                    await _stockService.RegisterStockMovementAsync(
                        userId: dto.UserId,
                        productId: detail.ProductId,
                        sectionId: detail.SectionId,
                        quantity: detail.Quantity,
                        purchasePrice: detail.PurchasePrice,
                        movementType: "PURCHASE",
                        reason: $"Ingreso por compra #{purchase.PurchaseId} - Factura: {purchase.InvoiceNumber ?? "sin número"}"
                    );
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Compra registrada y stock actualizado correctamente.",
                    purchaseId = purchase.PurchaseId,
                    totalAmount = purchase.TotalAmount
                });
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"No fue posible registrar la compra: {ex.InnerException?.Message ?? ex.Message}" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = $"Error al procesar la compra: {ex.Message}" });
            }
        }

        // POST: api/Purchases/5/cancel
        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> CancelPurchase(int id, [FromBody] CancelPurchaseDto? dto)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var purchase = await _context.Purchases
                    .Include(p => p.PurchaseDetails)
                    .FirstOrDefaultAsync(p => p.PurchaseId == id);

                if (purchase == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { message = "Compra no encontrada." });
                }

                if (purchase.Status == "CANCELED")
                {
                    await transaction.RollbackAsync();
                    return Conflict(new { message = "La compra ya fue anulada." });
                }

                if (purchase.Status != "COMPLETED")
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "Solo se pueden anular compras completadas." });
                }

                var userId = dto != null && dto.UserId > 0 ? dto.UserId : purchase.UserId;
                if (userId <= 0 || !await _context.Users.AnyAsync(user => user.UserId == userId && user.IsActive))
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = "El usuario que anula la compra no existe o está inactivo." });
                }

                // Agrupar por producto para soportar compras heredadas con líneas repetidas.
                var requiredByProduct = purchase.PurchaseDetails
                    .GroupBy(detail => new { detail.ProductId, detail.SectionId })
                    .Select(group => new
                    {
                        group.Key.ProductId,
                        group.Key.SectionId,
                        Quantity = group.Sum(detail => detail.Quantity)
                    })
                    .ToList();

                // Validar stock suficiente para TODOS los productos antes de tocar inventario.
                var deficiencies = new List<string>();
                foreach (var item in requiredByProduct)
                {
                    var inventory = await _context.Inventories
                        .FirstOrDefaultAsync(i => i.ProductId == item.ProductId && i.SectionId == item.SectionId);

                    var availableStock = inventory?.CurrentStock ?? 0;
                    if (inventory == null || availableStock < item.Quantity)
                    {
                        deficiencies.Add($"producto {item.ProductId} (disponible {availableStock}, requiere {item.Quantity})");
                    }
                }

                if (deficiencies.Count > 0)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = $"Stock insuficiente para revertir la compra: {string.Join("; ", deficiencies)}." });
                }

                foreach (var item in requiredByProduct)
                {
                    await _stockService.ReversePurchaseAsync(
                        userId,
                        item.ProductId,
                        item.SectionId,
                        item.Quantity,
                        $"Anulación de compra #{purchase.PurchaseId} - Factura: {purchase.InvoiceNumber ?? "sin número"}");
                }

                purchase.Status = "CANCELED";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Compra anulada y stock revertido correctamente.",
                    purchaseId = purchase.PurchaseId,
                    status = purchase.Status
                });
            }
            catch (InvalidOperationException ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = $"Error al anular la compra: {ex.Message}" });
            }
        }

        private async Task<string?> ValidatePurchase(CreatePurchaseDto? dto)
        {
            if (dto == null) return "El cuerpo de la compra es obligatorio.";

            if (dto.UserId <= 0 || !await _context.Users.AnyAsync(user => user.UserId == dto.UserId && user.IsActive))
                return "El usuario que registra la compra no existe o está inactivo.";

            if (dto.SupplierId <= 0 || !await _context.Suppliers.AnyAsync(supplier => supplier.SupplierId == dto.SupplierId))
                return "El proveedor seleccionado no existe.";

            if (dto.SectionId <= 0 || !await _context.Sections.AnyAsync(section => section.SectionId == dto.SectionId))
                return "La unidad de negocio seleccionada no existe.";

            if (!string.IsNullOrWhiteSpace(dto.InvoiceNumber) && dto.InvoiceNumber.Trim().Length > 50)
                return "El número de factura no puede superar 50 caracteres.";

            if (!string.IsNullOrWhiteSpace(dto.Observations) && dto.Observations.Trim().Length > 250)
                return "Las observaciones no pueden superar 250 caracteres.";

            if (dto.Details == null || dto.Details.Count == 0)
                return "La compra debe incluir al menos un producto.";

            if (dto.Details.Any(detail => detail.ProductId <= 0))
                return "Todos los productos deben ser válidos.";

            if (dto.Details.Any(detail => detail.Quantity <= 0))
                return "Cada producto debe tener una cantidad mayor que cero.";

            if (dto.Details.Any(detail => detail.PurchasePrice < 0))
                return "El precio de costo no puede ser negativo.";

            var duplicatedProductIds = dto.Details
                .GroupBy(detail => detail.ProductId)
                .Where(group => group.Count() > 1)
                .Select(group => group.Key)
                .ToList();

            if (duplicatedProductIds.Count > 0)
                return $"Hay productos repetidos en la compra (IDs: {string.Join(", ", duplicatedProductIds)}). Consolídalos en una sola línea.";

            var productIds = dto.Details.Select(detail => detail.ProductId).Distinct().ToList();
            var existingProductIds = await _context.Products
                .Where(product => productIds.Contains(product.ProductId))
                .Select(product => product.ProductId)
                .ToListAsync();

            var missingProductIds = productIds.Except(existingProductIds).ToList();
            if (missingProductIds.Count > 0)
                return $"Los siguientes productos no existen: {string.Join(", ", missingProductIds)}.";

            return null;
        }
    }
}