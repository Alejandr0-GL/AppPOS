using AppPOS.Api.Models;
using AppPOS.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventoriesController : ControllerBase
    {
        private readonly AppPosDbContext _context;
        private readonly IStockService _stockService;

        public InventoriesController(AppPosDbContext context, IStockService stockService)
        {
            _context = context;
            _stockService = stockService;
        }

        // GET: api/Inventories?sectionId=1&productId=2
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Inventory>>> GetInventories([FromQuery] int? sectionId, [FromQuery] int? productId)
        {
            var query = _context.Inventories
                .Include(i => i.Product)
                .Include(i => i.Section)
                .AsQueryable();

            if (sectionId.HasValue)
            {
                query = query.Where(i => i.SectionId == sectionId.Value);
            }

            if (productId.HasValue)
            {
                query = query.Where(i => i.ProductId == productId.Value);
            }

            return await query.ToListAsync();
        }

        // POST: api/Inventories/adjust
        [HttpPost("adjust")]
        public async Task<IActionResult> AdjustStock([FromQuery] int userId, [FromQuery] int productId, [FromQuery] int sectionId, [FromQuery] int newQuantity, [FromQuery] string reason)
        {
            try
            {
                await _stockService.AdjustStockAsync(userId, productId, sectionId, newQuantity, reason);
                return Ok(new { message = "Stock ajustado correctamente." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al ajustar stock: {ex.Message}");
            }
        }
    }
}