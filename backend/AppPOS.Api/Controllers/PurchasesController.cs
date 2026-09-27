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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Purchase>>> GetPurchases()
        {
            return await _context.Purchases
                .Include(p => p.Supplier)
                .Include(p => p.User)
                .Include(p => p.PurchaseDetails)
                    .ThenInclude(pd => pd.Product)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<IActionResult> CreatePurchase(Purchase purchase)
        {
            if (purchase.PurchaseDetails == null || !purchase.PurchaseDetails.Any())
            {
                return BadRequest("La compra debe incluir al menos un detalle.");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Asignaciones básicas del servidor
                purchase.Date = DateTime.Now;
                purchase.Status = "COMPLETED";
                purchase.TotalAmount = purchase.PurchaseDetails.Sum(d => d.Quantity * d.PurchasePrice);

                _context.Purchases.Add(purchase);
                await _context.SaveChangesAsync(); // Genera el purchase_id

                // Procesar cada detalle usando el StockService
                foreach (var detail in purchase.PurchaseDetails)
                {
                    detail.Subtotal = detail.Quantity * detail.PurchasePrice;

                    await _stockService.RegisterStockMovementAsync(
                        userId: purchase.UserId,
                        productId: detail.ProductId,
                        sectionId: detail.SectionId,
                        quantity: detail.Quantity,
                        purchasePrice: detail.PurchasePrice,
                        movementType: "PURCHASE",
                        reason: $"Ingreso por compra ID: {purchase.PurchaseId} - Factura: {purchase.InvoiceNumber}"
                    );
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { message = "Compra e inventario registrados correctamente.", purchaseId = purchase.PurchaseId });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error al procesar la compra: {ex.InnerException?.Message ?? ex.Message}");
            }
        }
    }
}