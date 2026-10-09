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
    public class OrdersController : ControllerBase
    {
        private readonly AppPosDbContext _context;
        private readonly IStockService _stockService;

        public OrdersController(AppPosDbContext context, IStockService stockService)
        {
            _context = context;
            _stockService = stockService;
        }

        // GET: api/Orders
        [HttpGet]
        public async Task<IActionResult> GetOrders(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int? customerId,
            [FromQuery] string? status,
            [FromQuery] int? sectionId)
        {
            var query = _context.Orders.AsQueryable();

            if (startDate.HasValue)
            {
                query = query.Where(o => o.Date >= startDate.Value.Date);
            }

            if (endDate.HasValue)
            {
                var exclusiveEndDate = endDate.Value.Date.AddDays(1);
                query = query.Where(o => o.Date < exclusiveEndDate);
            }

            if (customerId.HasValue)
            {
                query = query.Where(o => o.CustomerId == customerId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(o => o.Status == status);
            }

            if (sectionId.HasValue)
            {
                query = query.Where(o => o.SectionId == sectionId.Value);
            }

            var orders = await query
                .OrderByDescending(o => o.Date)
                .Select(o => new
                {
                    o.OrderId,
                    o.CustomerId,
                    o.SectionId,
                    o.Date,
                    o.TotalAmount,
                    o.PaymentMethod,
                    o.Status,
                    Customer = o.Customer != null ? new { o.Customer.CustomerId, o.Customer.Name, o.Customer.DocumentNumber } : null
                })
                .ToListAsync();

            return Ok(orders);
        }

        // GET: api/Orders/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetOrder(int id)
        {
            var order = await _context.Orders
                .Where(o => o.OrderId == id)
                .Select(o => new
                {
                    o.OrderId,
                    o.CustomerId,
                    o.Date,
                    o.TotalAmount,
                    o.PaymentMethod,
                    o.Status,
                    Customer = o.Customer != null ? new
                    {
                        o.Customer.CustomerId,
                        o.Customer.Name,
                        o.Customer.DocumentNumber,
                        o.Customer.Phone,
                        o.Customer.Email
                    } : null,
                    Section = _context.Sections
                        .Where(section => section.SectionId == o.SectionId)
                        .Select(section => new { section.SectionId, section.Name })
                        .FirstOrDefault(),
                    Details = o.OrderDetails.Select(detail => new
                    {
                        detail.OrderDetailId,
                        detail.ProductId,
                        detail.Quantity,
                        detail.UnitPrice,
                        detail.TaxAmount,
                        detail.Subtotal,
                        Product = _context.Products
                            .Where(product => product.ProductId == detail.ProductId)
                            .Select(product => new
                            {
                                product.ProductId,
                                product.Sku,
                                product.Barcode,
                                product.Name
                            })
                            .FirstOrDefault()
                    })
                })
                .FirstOrDefaultAsync();

            if (order == null)
            {
                return NotFound(new { message = "Orden no encontrada." });
            }

            return Ok(order);
        }

        // POST: api/Orders
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            if (dto.SectionId <= 0)
            {
                return BadRequest(new { message = "La sección de la venta es obligatoria." });
            }

            if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
            {
                return BadRequest(new { message = "El método de pago es obligatorio." });
            }

            if (dto.Details == null || !dto.Details.Any())
            {
                return BadRequest(new { message = "La orden debe contener al menos un producto." });
            }

            if (dto.Details.Any(detail => detail.SectionId != dto.SectionId))
            {
                return BadRequest(new { message = "Todos los productos de la orden deben pertenecer a la unidad de negocio seleccionada." });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                bool isElectronic = dto.InvoiceType?.ToUpper() == "ELECTRONIC";

                // Obtener los IDs de los productos solicitados para consultar sus tarifas de IVA
                var productIds = dto.Details.Select(d => d.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Include(p => p.Tax)
                    .Where(p => productIds.Contains(p.ProductId))
                    .ToDictionaryAsync(p => p.ProductId);

                // Calcular los ítems y totales
                decimal grandTotal = 0m;
                var orderDetailsToInsert = new List<OrderDetail>();

                foreach (var item in dto.Details)
                {
                    if (!products.TryGetValue(item.ProductId, out var product))
                    {
                        return BadRequest(new { message = $"El producto con ID {item.ProductId} no existe." });
                    }

                    decimal lineBase = item.Quantity * item.UnitPrice;
                    decimal calculatedTax = 0m;

                    // Solo si es Factura Electrónica se calcula el IVA dependiendo del producto
                    if (isElectronic && product.Tax != null)
                    {
                        calculatedTax = lineBase * (product.Tax.Percentage / 100m);
                    }

                    decimal lineSubtotal = lineBase + calculatedTax;
                    grandTotal += lineSubtotal;

                    orderDetailsToInsert.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = item.UnitPrice,
                        TaxAmount = calculatedTax,
                        Subtotal = lineSubtotal
                    });
                }

                // Crear cabecera de la Orden
                var order = new Order
                {
                    CustomerId = dto.CustomerId,
                    SectionId = dto.SectionId,
                    Date = DateTime.Now,
                    PaymentMethod = dto.PaymentMethod,
                    Status = isElectronic ? "PENDING_ELECTRONIC" : "COMPLETED", // Útil si luego envías el XML a un proveedor tecnológico
                    TotalAmount = grandTotal
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // Genera order.OrderId

                // Asignar orderId a los detalles y procesar inventario
                foreach (var detail in orderDetailsToInsert)
                {
                    detail.OrderId = order.OrderId;
                    _context.OrderDetails.Add(detail);

                    // Descontar stock
                    await _stockService.DeductStockForSaleAsync(
                        dto.UserId,
                        detail.ProductId,
                        dto.SectionId,
                        detail.Quantity,
                        $"Venta ({dto.InvoiceType}) - Orden #{order.OrderId}"
                    );
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Venta procesada con éxito",
                    orderId = order.OrderId,
                    invoiceType = dto.InvoiceType,
                    totalAmount = grandTotal
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
                return StatusCode(500, new { message = $"Error al procesar la venta: {ex.Message}" });
            }
        }

        // PUT: api/Orders/5/cancel
        [HttpPut("{id:int}/cancel")]
        public async Task<IActionResult> CancelOrder(int id, [FromBody] CancelOrderDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var order = await _context.Orders
                    .Include(o => o.OrderDetails)
                    .FirstOrDefaultAsync(o => o.OrderId == id);

                if (order == null)
                {
                    return NotFound(new { message = "Orden no encontrada." });
                }

                if (order.Status == "CANCELLED")
                {
                    return Conflict(new { message = "La orden ya fue cancelada." });
                }

                if (order.Status != "COMPLETED")
                {
                    return BadRequest(new { message = "Solo se pueden cancelar órdenes completadas." });
                }

                foreach (var detail in order.OrderDetails)
                {
                    await _stockService.RestoreStockForSaleAsync(
                        dto.UserId,
                        detail.ProductId,
                        order.SectionId,
                        detail.Quantity,
                        $"Venta cancelada - Orden #{order.OrderId}");
                }

                order.Status = "CANCELLED";
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Venta cancelada y stock restaurado correctamente.",
                    orderId = order.OrderId,
                    status = order.Status
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
                return StatusCode(500, new { message = $"Error al cancelar la venta: {ex.Message}" });
            }
        }
    }
}