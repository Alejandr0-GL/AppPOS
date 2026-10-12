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
        public async Task<ActionResult<IEnumerable<object>>> GetInventories([FromQuery] int sectionId, [FromQuery] int? productId)
        {
            if (sectionId <= 0)
            {
                return BadRequest(new { message = "sectionId es obligatorio para consultar inventario." });
            }

            var query = _context.Inventories
                .Where(i => i.SectionId == sectionId)
                .AsQueryable();

            if (productId.HasValue)
            {
                query = query.Where(i => i.ProductId == productId.Value);
            }

            return Ok(await query
                .OrderBy(i => i.Product.Name)
                .Select(i => new
                {
                    i.InventoryId,
                    i.ProductId,
                    i.SectionId,
                    i.CurrentStock,
                    i.MinStock,
                    i.UpdatedAt,
                    Product = new
                    {
                        i.Product.ProductId,
                        i.Product.Name,
                        i.Product.Sku,
                        i.Product.Barcode,
                        i.Product.SalePrice,
                        Category = i.Product.Category == null ? null : new { i.Product.Category.CategoryId, i.Product.Category.Name }
                    },
                    Section = new { i.Section.SectionId, i.Section.Name }
                })
                .ToListAsync());
        }

        // PUT: api/Inventories/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> AdjustStock([FromBody] UpdateInventoryDto dto, int id)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                await _stockService.UpdateInventoryAsync(dto.UserId, id, dto.SectionId, dto.CurrentStock, dto.MinStock, dto.Reason ?? string.Empty);
                await transaction.CommitAsync();
                return Ok(new { message = "Stock ajustado correctamente." });
            }
            catch (KeyNotFoundException ex)
            {
                await transaction.RollbackAsync();
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = $"Error al ajustar stock: {ex.Message}" });
            }
        }
    }
}