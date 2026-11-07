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
            [FromQuery] string? invoiceType,
            [FromQuery] string? plate)
        {
            var query = _context.Orders.AsQueryable();

            // INV-01: historial de un vehículo (coincidencia parcial, sin espacios ni guiones).
            if (!string.IsNullOrWhiteSpace(plate))
            {
                var normalizedPlate = new string(plate.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
                if (normalizedPlate.Length > 0)
                    query = query.Where(o => o.VehiclePlate != null && o.VehiclePlate.Contains(normalizedPlate));
            }

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
                    o.ReceivedAmount,
                    o.ChangeAmount,
                    o.PaidAt,
                    o.UserId,
                    o.InvoiceType,
                    o.CancelledByUserId,
                    o.Status,
                    o.VehiclePlate,
                    o.CustomerName,
                    o.CustomerDocument,
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
                    o.ReceivedAmount,
                    o.ChangeAmount,
                    o.PaidAt,
                    o.PriceChangeReason,
                    o.InvoiceType,
                    o.VehiclePlate,
                    o.CustomerName,
                    o.CustomerDocument,
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
                        detail.ListPrice,
                        detail.Description,
                        detail.UnitCost,
                        detail.EmployeeId,
                        detail.AppliedCommissionPercentage,
                        detail.CommissionAmount,
                        detail.AppliedBusinessProfitPercentage,
                        detail.LocalProfitAmount,
                        Employee = detail.Employee == null
                            ? null
                            : new { detail.Employee.EmployeeId, detail.Employee.Name },
                        detail.TaxAmount,
                        detail.AppliedTaxPercentage,
                        detail.TaxName,
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

                // INV-01: "a nombre de" quién sale la factura. El cliente guardado es opcional (sólo los
                // frecuentes están en Clientes); si no se envía, la venta queda en "Consumidor Final"
                // con el nombre y documento escritos en el POS. Ambos se congelan en la venta.
                Customer? savedCustomer = null;
                if (dto.CustomerId is int requestedCustomerId)
                {
                    savedCustomer = await _context.Customers.FirstOrDefaultAsync(c => c.CustomerId == requestedCustomerId);
                    if (savedCustomer == null)
                        return BadRequest(new { message = "El cliente seleccionado no existe." });
                }
                else
                {
                    savedCustomer = await _context.Customers.FirstOrDefaultAsync(c => c.DocumentNumber == Customer.FinalConsumerDocument);
                    if (savedCustomer == null)
                    {
                        savedCustomer = new Customer { Name = "Consumidor Final", DocumentNumber = Customer.FinalConsumerDocument, DocumentType = "CC" };
                        _context.Customers.Add(savedCustomer);
                        await _context.SaveChangesAsync();
                    }
                }

                var savedIsFinalConsumer = savedCustomer.DocumentNumber == Customer.FinalConsumerDocument;
                var customerName = dto.CustomerName?.Trim();
                if (string.IsNullOrWhiteSpace(customerName))
                    customerName = savedIsFinalConsumer ? "Consumidor final" : savedCustomer.Name;
                var customerDocument = dto.CustomerDocument?.Trim();
                if (string.IsNullOrWhiteSpace(customerDocument))
                    customerDocument = savedIsFinalConsumer ? null : savedCustomer.DocumentNumber;

                if (customerName.Length > 100)
                    return BadRequest(new { message = "El nombre de la factura no puede superar 100 caracteres." });
                if (customerDocument?.Length > 30)
                    return BadRequest(new { message = "El documento de la factura no puede superar 30 caracteres." });

                // La factura electrónica se replica en el software de facturación (allá está el RUT):
                // sólo exige saber a nombre de quién sale. El documento no se pide en el POS.
                if (isElectronic && customerName.Equals("Consumidor final", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "Escribe a nombre de quién sale la factura electrónica." });

                // INV-01: placa opcional, normalizada (ABC123 / ABC12D). Sólo letras y números.
                string? vehiclePlate = null;
                if (!string.IsNullOrWhiteSpace(dto.VehiclePlate))
                {
                    vehiclePlate = new string(dto.VehiclePlate.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
                    if (vehiclePlate.Length < 3 || vehiclePlate.Length > 10)
                        return BadRequest(new { message = "La placa no es válida (usa sólo letras y números, p. ej. ABC123)." });
                }

                // Obtener los IDs de los productos solicitados para consultar sus tarifas de IVA
                var productIds = dto.Details.Select(d => d.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Include(p => p.Tax)
                    .Where(p => productIds.Contains(p.ProductId))
                    .ToDictionaryAsync(p => p.ProductId);

                var employeeIds = dto.Details
                    .Where(detail => detail.EmployeeId.HasValue)
                    .Select(detail => detail.EmployeeId!.Value)
                    .Distinct()
                    .ToList();

                if (employeeIds.Count > 0)
                {
                    var activeEmployeeIds = await _context.Employees
                        .Where(employee => employeeIds.Contains(employee.EmployeeId) && employee.IsActive)
                        .Select(employee => employee.EmployeeId)
                        .ToListAsync();

                    var missingEmployeeIds = employeeIds.Except(activeEmployeeIds).ToList();
                    if (missingEmployeeIds.Count > 0)
                    {
                        return BadRequest(new { message = $"Los siguientes empleados no existen o están inactivos: {string.Join(", ", missingEmployeeIds)}." });
                    }
                }

                // Calcular los ítems y totales
                decimal grandTotal = 0m;
                var orderDetailsToInsert = new List<OrderDetail>();

                foreach (var item in dto.Details)
                {
                    if (!products.TryGetValue(item.ProductId, out var product))
                    {
                        return BadRequest(new { message = $"El producto con ID {item.ProductId} no existe." });
                    }

                    // El precio de lista SIEMPRE se toma del producto en BD (el UnitPrice del cliente se ignora).
                    // POS-07: el cajero puede cobrar otro precio sólo de forma explícita (PriceOverride);
                    // se congela el precio de lista para conservar la trazabilidad del cambio.
                    decimal listPrice = product.SalePrice;
                    decimal unitPrice = listPrice;
                    decimal unitCost = product.PurchasePrice;
                    string? lineDescription = null;

                    if (product.IsOpenItem)
                    {
                        // POS-07: ítem abierto ("Otros"): descripción, precio y costo vienen de la venta.
                        lineDescription = item.Description?.Trim();
                        if (string.IsNullOrWhiteSpace(lineDescription))
                        {
                            return BadRequest(new { message = $"Escribe la descripción de '{product.Name}' (qué se está vendiendo)." });
                        }

                        if (lineDescription.Length > 150)
                        {
                            return BadRequest(new { message = $"La descripción de '{product.Name}' no puede superar 150 caracteres." });
                        }

                        var openPrice = Math.Round(item.PriceOverride ?? 0m, 2);
                        if (openPrice <= 0m)
                        {
                            return BadRequest(new { message = $"El precio de '{lineDescription}' debe ser mayor a 0." });
                        }

                        unitCost = Math.Round(item.UnitCost ?? 0m, 2);
                        if (unitCost < 0m)
                        {
                            return BadRequest(new { message = $"El costo de '{lineDescription}' no puede ser negativo." });
                        }

                        if (openPrice < unitCost)
                        {
                            return BadRequest(new { message = $"El precio de '{lineDescription}' ($ {openPrice:N0}) no puede ser menor al costo ($ {unitCost:N0})." });
                        }

                        // No hay precio "original" que comparar: el de lista es el mismo cobrado.
                        unitPrice = openPrice;
                        listPrice = openPrice;
                    }
                    else if (item.PriceOverride.HasValue)
                    {
                        var overridePrice = Math.Round(item.PriceOverride.Value, 2);
                        if (overridePrice <= 0m)
                        {
                            return BadRequest(new { message = $"El precio de venta de '{product.Name}' debe ser mayor a 0." });
                        }

                        // Regla de negocio: un precio cambiado nunca puede quedar por debajo del costo
                        // (insumo / compra). Igual al costo sí se permite (margen 0).
                        if (overridePrice != listPrice && overridePrice < product.PurchasePrice)
                        {
                            return BadRequest(new { message = $"El precio de '{product.Name}' ($ {overridePrice:N0}) no puede ser menor al costo ($ {product.PurchasePrice:N0})." });
                        }

                        unitPrice = overridePrice;
                    }
                    decimal lineBase = item.Quantity * unitPrice;
                    decimal calculatedTax = 0m;
                    decimal appliedTaxPercentage = 0m;
                    string? taxName = null;

                    // INV-01: el impuesto del producto (normalmente IVA) se cobra SÓLO en factura
                    // electrónica, encima del precio. En factura de venta se cobra el precio y ya.
                    // Los ítems "Otros" nunca llevan impuesto. El impuesto no es ganancia: la
                    // comisión y la ganancia se calculan sobre el precio sin impuesto.
                    if (isElectronic && !product.IsOpenItem && product.Tax != null && product.Tax.Percentage > 0m)
                    {
                        appliedTaxPercentage = product.Tax.Percentage;
                        taxName = product.Tax.Name;
                        calculatedTax = Math.Round(lineBase * (appliedTaxPercentage / 100m), 2, MidpointRounding.AwayFromZero);
                    }

                    decimal lineSubtotal = lineBase + calculatedTax;
                    grandTotal += lineSubtotal;

                    // Congelar la comisión al momento de la venta (por unidad).
                    var appliedCommissionPercentage = item.EmployeeId.HasValue
                        ? product.EmployeeCommissionPercentage
                        : 0m;

                    var commissionBase = Math.Max(0m, unitPrice - unitCost);
                    var commissionAmount = commissionBase * (appliedCommissionPercentage / 100m);
                    var localProfitAmount = commissionBase * (product.BusinessProfitPercentage / 100m);

                    orderDetailsToInsert.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = unitPrice,
                        ListPrice = listPrice,
                        Description = lineDescription,
                        UnitCost = unitCost,
                        EmployeeId = item.EmployeeId,
                        AppliedCommissionPercentage = appliedCommissionPercentage,
                        CommissionAmount = commissionAmount,
                        AppliedBusinessProfitPercentage = product.BusinessProfitPercentage,
                        LocalProfitAmount = localProfitAmount,
                        TaxAmount = calculatedTax,
                        AppliedTaxPercentage = appliedTaxPercentage,
                        TaxName = taxName,
                        Subtotal = lineSubtotal
                    });
                }

                // Normalizar el método de pago y calcular el cambio en el servidor.
                var paymentMethod = dto.PaymentMethod!.Trim().ToUpperInvariant();
                var isCashPayment = paymentMethod is "CASH" or "EFECTIVO";
                // POS-06: venta a crédito / pago pendiente. El inventario se descuenta igual.
                var isCreditPayment = paymentMethod is "CREDIT" or "CREDITO" or "PENDING";
                decimal? receivedAmount = null;
                decimal? changeAmount = null;

                if (isCreditPayment)
                {
                    paymentMethod = "CREDIT";
                    receivedAmount = 0m;
                    changeAmount = 0m;
                }
                else if (isCashPayment && dto.ReceivedAmount.HasValue)
                {
                    if (dto.ReceivedAmount.Value < grandTotal)
                    {
                        return BadRequest(new { message = $"El efectivo recibido ($ {dto.ReceivedAmount.Value:N0}) es menor al total a pagar ($ {grandTotal:N0})." });
                    }

                    receivedAmount = dto.ReceivedAmount.Value;
                    changeAmount = dto.ReceivedAmount.Value - grandTotal;
                }

                // POS-07: motivo único por venta, sólo si alguna línea se cobró distinto al precio de lista.
                var anyPriceChanged = orderDetailsToInsert.Any(detail => detail.UnitPrice != detail.ListPrice);
                var priceChangeReason = dto.PriceChangeReason?.Trim();
                if (priceChangeReason?.Length > 200)
                {
                    return BadRequest(new { message = "El motivo del ajuste de precio no puede superar 200 caracteres." });
                }

                // Crear cabecera de la Orden
                var order = new Order
                {
                    PriceChangeReason = anyPriceChanged && !string.IsNullOrWhiteSpace(priceChangeReason) ? priceChangeReason : null,
                    CustomerId = savedCustomer.CustomerId,
                    CustomerName = customerName,
                    CustomerDocument = customerDocument,
                    VehiclePlate = vehiclePlate,
                    SectionId = dto.SectionId,
                    UserId = dto.UserId,
                    Date = DateTime.Now,
                    PaymentMethod = paymentMethod,
                    ReceivedAmount = receivedAmount,
                    ChangeAmount = changeAmount,
                    InvoiceType = dto.InvoiceType?.ToUpper() == "ELECTRONIC" ? "ELECTRONIC" : "POS",
                    // POS-06: las ventas a crédito quedan PENDING hasta que se registre el pago.
                    // El resto se registra COMPLETED y puede cancelarse desde el historial.
                    Status = isCreditPayment ? "PENDING" : "COMPLETED",
                    TotalAmount = grandTotal
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync(); // Genera order.OrderId

                // Asignar orderId a los detalles y procesar inventario
                foreach (var detail in orderDetailsToInsert)
                {
                    detail.OrderId = order.OrderId;
                    _context.OrderDetails.Add(detail);

                    // Los servicios (mano de obra) no descuentan inventario.
                    if (!products[detail.ProductId].IsService)
                    {
                        await _stockService.DeductStockForSaleAsync(
                            dto.UserId,
                            detail.ProductId,
                            dto.SectionId,
                            detail.Quantity,
                            $"Venta ({dto.InvoiceType}) - Orden #{order.OrderId}"
                        );
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Venta procesada con éxito",
                    orderId = order.OrderId,
                    status = order.Status,
                    invoiceType = dto.InvoiceType,
                    paymentMethod = order.PaymentMethod,
                    totalAmount = grandTotal,
                    receivedAmount,
                    changeAmount
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

        // PATCH: api/Orders/5/pay
        // POS-06: registra el pago final de una venta a crédito (estado PENDING → PAID)
        [HttpPatch("{id:int}/pay")]
        public async Task<IActionResult> PayOrder(int id, [FromBody] OrderPaymentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
            {
                return BadRequest(new { message = "El método de pago es obligatorio." });
            }

            var paymentMethod = dto.PaymentMethod.Trim().ToUpperInvariant();
            var isCashPayment = paymentMethod is "CASH" or "EFECTIVO";
            var isTransferPayment = paymentMethod is "TRANSFER" or "TRANSFERENCIA";

            if (!isCashPayment && !isTransferPayment)
            {
                return BadRequest(new { message = "El método de pago final debe ser efectivo (CASH) o transferencia (TRANSFER)." });
            }

            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null)
            {
                return NotFound(new { message = "Orden no encontrada." });
            }

            if (order.Status == "CANCELLED")
            {
                return Conflict(new { message = "La orden está anulada y no se puede cobrar." });
            }

            if (order.Status != "PENDING")
            {
                return Conflict(new { message = $"Solo se pueden cobrar órdenes pendientes de pago (estado actual: {order.Status})." });
            }

            decimal? receivedAmount = null;
            decimal? changeAmount = null;

            if (isCashPayment && dto.ReceivedAmount.HasValue)
            {
                if (dto.ReceivedAmount.Value < order.TotalAmount)
                {
                    return BadRequest(new { message = $"El efectivo recibido ($ {dto.ReceivedAmount.Value:N0}) es menor al total a pagar ($ {order.TotalAmount:N0})." });
                }

                receivedAmount = dto.ReceivedAmount.Value;
                changeAmount = dto.ReceivedAmount.Value - order.TotalAmount;
            }

            order.Status = "PAID";
            order.PaymentMethod = isCashPayment ? "CASH" : "TRANSFER";
            order.ReceivedAmount = receivedAmount;
            order.ChangeAmount = changeAmount;
            order.PaidAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Pago registrado con éxito",
                orderId = order.OrderId,
                status = order.Status,
                paymentMethod = order.PaymentMethod,
                totalAmount = order.TotalAmount,
                receivedAmount,
                changeAmount
            });
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
                // POS-06: las ventas a crédito (PENDING) y ya pagadas (PAID) también se pueden anular.
                var cancellableStatuses = new[] { "COMPLETED", "PAID", "PENDING", "PENDING_ELECTRONIC" };
                if (!cancellableStatuses.Contains(order.Status))
                {
                    return BadRequest(new { message = "La orden no se puede anular en su estado actual." });
                }

                // Los servicios (mano de obra) no reponen inventario al anular.
                var productIds = order.OrderDetails.Select(detail => detail.ProductId).Distinct().ToList();
                var serviceProductIds = await _context.Products
                    .Where(product => productIds.Contains(product.ProductId) && product.IsService)
                    .Select(product => product.ProductId)
                    .ToListAsync();

                foreach (var detail in order.OrderDetails)
                {
                    if (serviceProductIds.Contains(detail.ProductId)) continue;

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