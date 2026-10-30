using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public DashboardController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Dashboard/summary?sectionId=1
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int sectionId)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            // Solo productos activos con inventario en la unidad seleccionada (los servicios no tienen stock).
            var inventories = _context.Inventories
                .AsNoTracking()
                .Where(inventory => inventory.SectionId == sectionId && !inventory.Product.IsService && inventory.Product.IsActive);

            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);

            var todayOrders = _context.Orders
                .AsNoTracking()
                .Where(order => order.SectionId == sectionId
                    && order.Status != "CANCELLED"
                    && order.Date >= today
                    && order.Date < tomorrow);

            var summary = new DashboardSummaryDto
            {
                // El índice único (ProductId, SectionId) garantiza una fila por producto.
                CostValue = await inventories.SumAsync(inventory => (decimal?)(inventory.CurrentStock * inventory.Product.PurchasePrice)) ?? 0m,
                SaleValue = await inventories.SumAsync(inventory => (decimal?)(inventory.CurrentStock * inventory.Product.SalePrice)) ?? 0m,
                LowStockCount = await inventories.CountAsync(inventory => inventory.CurrentStock <= inventory.MinStock),
                OutOfStockCount = await inventories.CountAsync(inventory => inventory.CurrentStock == 0),
                TodaySalesTotal = await todayOrders.SumAsync(order => (decimal?)order.TotalAmount) ?? 0m,
                TodayOrdersCount = await todayOrders.CountAsync()
            };

            summary.PotentialProfit = summary.SaleValue - summary.CostValue;

            return Ok(summary);
        }

        // GET: api/Dashboard/low-stock?sectionId=1
        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStock([FromQuery] int sectionId)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            var lowStock = await _context.Inventories
                .AsNoTracking()
                .Where(inventory => inventory.SectionId == sectionId
                    && !inventory.Product.IsService
                    && inventory.Product.IsActive
                    && inventory.CurrentStock <= inventory.MinStock)
                .OrderBy(inventory => inventory.CurrentStock)
                .ThenBy(inventory => inventory.Product.Name)
                .Select(inventory => new LowStockItemDto
                {
                    InventoryId = inventory.InventoryId,
                    ProductId = inventory.ProductId,
                    Name = inventory.Product.Name,
                    Sku = inventory.Product.Sku,
                    Barcode = inventory.Product.Barcode,
                    Category = inventory.Product.Category != null ? inventory.Product.Category.Name : null,
                    CurrentStock = inventory.CurrentStock,
                    MinStock = inventory.MinStock
                })
                .ToListAsync();

            return Ok(lowStock);
        }

        // GET: api/Dashboard/charts/sales-trend?sectionId=1&startDate=2026-10-01&endDate=2026-10-22
        [HttpGet("charts/sales-trend")]
        public async Task<IActionResult> GetSalesTrend(
            [FromQuery] int sectionId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            // Sin parámetros se conserva el comportamiento por defecto: últimos 7 días.
            var resolvedEnd = (endDate ?? DateTime.Today).Date;
            var resolvedStart = (startDate ?? resolvedEnd.AddDays(-6)).Date;

            if (resolvedStart > resolvedEnd)
            {
                return BadRequest(new { message = "La fecha inicial no puede ser mayor que la fecha final." });
            }

            var totalDays = (resolvedEnd - resolvedStart).Days + 1;
            if (totalDays > 366)
            {
                return BadRequest(new { message = "El rango de fechas no puede superar 366 días." });
            }

            var endExclusive = resolvedEnd.AddDays(1);

            var salesByDay = await _context.Orders
                .AsNoTracking()
                .Where(order => order.SectionId == sectionId
                    && order.Status != "CANCELLED"
                    && order.Date >= resolvedStart
                    && order.Date < endExclusive)
                .GroupBy(order => order.Date.Date)
                .Select(group => new
                {
                    Date = group.Key,
                    Total = group.Sum(order => order.TotalAmount)
                })
                .ToListAsync();

            var totalsByDay = salesByDay.ToDictionary(item => item.Date, item => item.Total);

            // Se devuelve cada día del rango, con 0 cuando no hubo ventas.
            var trend = Enumerable.Range(0, totalDays)
                .Select(offset =>
                {
                    var date = resolvedStart.AddDays(offset);
                    return new SalesTrendPointDto
                    {
                        Date = date,
                        Total = totalsByDay.TryGetValue(date, out var total) ? total : 0m
                    };
                })
                .ToList();

            return Ok(trend);
        }

        // GET: api/Dashboard/charts/category-distribution?sectionId=1
        [HttpGet("charts/category-distribution")]
        public async Task<IActionResult> GetCategoryDistribution([FromQuery] int sectionId)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            var distribution = await _context.Inventories
                .AsNoTracking()
                .Where(inventory => inventory.SectionId == sectionId && !inventory.Product.IsService && inventory.Product.IsActive)
                .GroupBy(inventory => inventory.Product.Category != null ? inventory.Product.Category.Name : "Sin categoría")
                .Select(group => new CategoryDistributionItemDto
                {
                    Category = group.Key,
                    CostValue = group.Sum(inventory => inventory.CurrentStock * inventory.Product.PurchasePrice),
                    SaleValue = group.Sum(inventory => inventory.CurrentStock * inventory.Product.SalePrice),
                    TotalUnits = group.Sum(inventory => inventory.CurrentStock),
                    ProductCount = group.Count()
                })
                .ToListAsync();

            return Ok(distribution.OrderByDescending(item => item.CostValue).ToList());
        }

        // GET: api/Dashboard/charts/profit-trend?sectionId=1&startDate=2026-10-01&endDate=2026-10-27
        [HttpGet("charts/profit-trend")]
        public async Task<IActionResult> GetProfitTrend(
            [FromQuery] int sectionId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            var resolvedEnd = (endDate ?? DateTime.Today).Date;
            var resolvedStart = (startDate ?? resolvedEnd.AddDays(-6)).Date;

            if (resolvedStart > resolvedEnd)
            {
                return BadRequest(new { message = "La fecha inicial no puede ser mayor que la fecha final." });
            }

            var totalDays = (resolvedEnd - resolvedStart).Days + 1;
            if (totalDays > 366)
            {
                return BadRequest(new { message = "El rango de fechas no puede superar 366 días." });
            }

            var endExclusive = resolvedEnd.AddDays(1);

            // Comisión y ganancia local se leen congeladas por línea (no se recalculan con el producto actual).
            // El costo de reposición sí se consulta actual: productos usan el costo congelado y servicios el costo actual.
            var rows = await (
                from detail in _context.OrderDetails.AsNoTracking()
                join order in _context.Orders.AsNoTracking() on detail.OrderId equals order.OrderId
                join product in _context.Products.AsNoTracking() on detail.ProductId equals product.ProductId
                where order.SectionId == sectionId
                    && order.Status == "COMPLETED"
                    && order.Date >= resolvedStart
                    && order.Date < endExclusive
                select new
                {
                    Date = order.Date.Date,
                    detail.UnitPrice,
                    detail.UnitCost,
                    detail.Quantity,
                    detail.CommissionAmount,
                    detail.LocalProfitAmount,
                    product.IsService,
                    product.PurchasePrice
                }).ToListAsync();

            var byDay = rows
                .GroupBy(row => row.Date)
                .ToDictionary(
                    group => group.Key,
                    group =>
                    {
                        decimal sales = 0m;
                        decimal cost = 0m;
                        decimal commission = 0m;
                        decimal profit = 0m;

                        foreach (var row in group)
                        {
                            // Servicios: costo de insumo ACTUAL del producto. Productos: costo congelado (o actual si no existe).
                            var replacementCost = row.IsService
                                ? row.PurchasePrice
                                : (row.UnitCost > 0m ? row.UnitCost : row.PurchasePrice);

                            sales += row.UnitPrice * row.Quantity;
                            cost += replacementCost * row.Quantity;
                            // Comisión y ganancia local congeladas al momento de la venta (por unidad).
                            commission += row.CommissionAmount * row.Quantity;
                            profit += row.LocalProfitAmount * row.Quantity;
                        }

                        return new
                        {
                            Sales = Math.Round(sales, 2),
                            Cost = Math.Round(cost, 2),
                            Commission = Math.Round(commission, 2),
                            Profit = Math.Round(profit, 2)
                        };
                    });

            // Se devuelve cada día del rango, con ceros cuando no hubo ventas.
            var trend = Enumerable.Range(0, totalDays)
                .Select(offset =>
                {
                    var date = resolvedStart.AddDays(offset);

                    if (!byDay.TryGetValue(date, out var day))
                    {
                        return new ProfitTrendPointDto { Date = date, Sales = 0m, Cost = 0m, Commission = 0m, Profit = 0m };
                    }

                    return new ProfitTrendPointDto
                    {
                        Date = date,
                        Sales = day.Sales,
                        Cost = day.Cost,
                        Commission = day.Commission,
                        Profit = day.Profit
                    };
                })
                .ToList();

            return Ok(trend);
        }
    }
}
