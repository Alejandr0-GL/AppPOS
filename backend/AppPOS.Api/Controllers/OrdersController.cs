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
            [FromQuery] int? sectionId,
            [FromQuery] string? invoiceType)
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

            if (!string.IsNullOrWhiteSpace(invoiceType))
            {
                query = query.Where(o => o.InvoiceType == invoiceType);
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
                    o.UserId,
                    o.InvoiceType,
                    o.CancelledByUserId,
                    o.Status,
                            Customer = o.Customer != null ? new
                            {
                                o.Customer.CustomerId,
                                o.Customer.Name,
                                o.Customer.DocumentNumber,
                                o.Customer.DocumentType,
                                o.Customer.Address,
                                o.Customer.City,
                                o.Customer.Department
                            } : null,
                    User = _context.Users
                        .Where(user => user.UserId == o.UserId)
                        .Select(user => new { user.UserId, user.Username })
                        .FirstOrDefault(),
                    CancelledBy = _context.Users
                        .Where(user => user.UserId == o.CancelledByUserId)
                        .Select(user => new { user.UserId, user.Username })
                        .FirstOrDefault()
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
                    o.SectionId,
                    o.UserId,
                    o.Date,
                    o.TotalAmount,
                    o.PaymentMethod,
                    o.InvoiceType,
                    o.CancelledByUserId,
                    o.Status,
                    Customer = o.Customer != null ? new
                    {
                        o.Customer.CustomerId,
                        o.Customer.Name,
                        o.Customer.DocumentNumber,
                        o.Customer.DocumentType,
                        o.Customer.Address,
                        o.Customer.City,
                        o.Customer.Department,
                        o.Customer.Phone,
                        o.Customer.Email
                    } : null,
                        User = _context.Users
                            .Where(user => user.UserId == o.UserId)
                            .Select(user => new { user.UserId, user.Username })
                            .FirstOrDefault(),
                    CancelledBy = _context.Users
                        .Where(user => user.UserId == o.CancelledByUserId)
                        .Select(user => new { user.UserId, user.Username })
                        .FirstOrDefault(),
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

            if (!await _context.Users.AnyAsync(user => user.UserId == dto.UserId && user.IsActive))
            {
                return BadRequest(new { message = "El usuario que registra la venta no existe o está inactivo." });
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

                    // El precio unitario SIEMPRE se toma del producto consultado en BD.
                    // El UnitPrice enviado por el cliente se ignora para evitar manipulación de precios.
                    decimal unitPrice = product.SalePrice;
                    decimal lineBase = item.Quantity * unitPrice;
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
                        UnitPrice = unitPrice,
                        TaxAmount = calculatedTax,
                        Subtotal = lineSubtotal
                    });
                }

                // Crear cabecera de la Orden
                var order = new Order
                {
                    CustomerId = dto.CustomerId,
                    SectionId = dto.SectionId,
                    UserId = dto.UserId,
                    Date = DateTime.Now,
                    PaymentMethod = dto.PaymentMethod,
                    InvoiceType = dto.InvoiceType?.ToUpper() == "ELECTRONIC" ? "ELECTRONIC" : "POS",
                    // Pre-MVP: toda venta se registra como COMPLETED para que aparezca en el historial
                    // y pueda cancelarse. El InvoiceType conserva la distinción POS vs. ELECTRONIC.
                    Status = "COMPLETED",
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

                // Se admite también PENDING_ELECTRONIC para poder anular facturas electrónicas heredadas.
                if (order.Status != "COMPLETED" && order.Status != "PENDING_ELECTRONIC")
                {
                    return BadRequest(new { message = "Solo se pueden cancelar órdenes completadas o pendientes de envío electrónico." });
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
                order.CancelledByUserId = dto.UserId;
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