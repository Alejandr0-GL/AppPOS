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
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _context.Orders
                .OrderByDescending(o => o.Date)
                .Select(o => new
                {
                    o.OrderId,
                    o.CustomerId,
                    o.Date,
                    o.TotalAmount,
                    o.PaymentMethod,
                    o.Status,
                    Customer = o.Customer != null ? new { o.Customer.CustomerId, o.Customer.Name, o.Customer.DocumentNumber } : null
                })
                .ToListAsync();

            return Ok(orders);
        }

        // POST: api/Orders
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
            {
                return BadRequest(new { message = "El método de pago es obligatorio." });
            }

            if (dto.Details == null || !dto.Details.Any())
            {
                return BadRequest(new { message = "La orden debe contener al menos un producto." });
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

                    // Obtener el sectionId que venía en la solicitud
                    var itemDto = dto.Details.First(d => d.ProductId == detail.ProductId);

                    // Descontar stock
                    await _stockService.DeductStockForSaleAsync(
                        dto.UserId,
                        detail.ProductId,
                        itemDto.SectionId,
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
    }
}