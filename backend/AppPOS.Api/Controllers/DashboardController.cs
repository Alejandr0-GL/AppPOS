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

            // Solo productos activos con inventario en la unidad seleccionada.
            var inventories = _context.Inventories
                .AsNoTracking()
                .Where(inventory => inventory.SectionId == sectionId && inventory.Product.IsActive);

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
                ActiveProducts = await inventories.CountAsync(),
                TotalUnits = await inventories.SumAsync(inventory => (int?)inventory.CurrentStock) ?? 0,
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

        // GET: api/Dashboard/charts/sales-trend?sectionId=1
        [HttpGet("charts/sales-trend")]
        public async Task<IActionResult> GetSalesTrend([FromQuery] int sectionId)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar el dashboard." });
            }

            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId))
            {
                return NotFound(new { message = "La unidad de negocio no existe." });
            }

            var today = DateTime.Today;
            var startDate = today.AddDays(-6);
            var endDate = today.AddDays(1);

            var salesByDay = await _context.Orders
                .AsNoTracking()
                .Where(order => order.SectionId == sectionId
                    && order.Status != "CANCELLED"
                    && order.Date >= startDate
                    && order.Date < endDate)
                .GroupBy(order => order.Date.Date)
                .Select(group => new
                {
                    Date = group.Key,
                    Total = group.Sum(order => order.TotalAmount)
                })
                .ToListAsync();

            var totalsByDay = salesByDay.ToDictionary(item => item.Date, item => item.Total);

            // Se devuelven siempre los 7 días, con 0 cuando no hubo ventas.
            var trend = Enumerable.Range(0, 7)
                .Select(offset =>
                {
                    var date = startDate.AddDays(offset);
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
                .Where(inventory => inventory.SectionId == sectionId && inventory.Product.IsActive)
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
    }
}
