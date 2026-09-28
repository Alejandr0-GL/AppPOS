using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StockMovementsController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public StockMovementsController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/StockMovements?productId=1&sectionId=2
        [HttpGet]
        public async Task<IActionResult> GetMovements([FromQuery] int? productId, [FromQuery] int? sectionId)
        {
            var query = _context.StockMovements.AsQueryable();

            if (productId.HasValue)
            {
                query = query.Where(m => m.ProductId == productId.Value);
            }

            if (sectionId.HasValue)
            {
                query = query.Where(m => m.SectionId == sectionId.Value);
            }

            var result = await query
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.MovementId,
                    m.Quantity,
                    m.MovementType,
                    m.Reason,
                    m.CreatedAt,
                    Product = m.Product != null ? new
                    {
                        m.Product.ProductId,
                        m.Product.Name,
                        m.Product.Sku,
                        m.Product.Barcode
                    } : null,
                    Section = m.Section != null ? new
                    {
                        m.Section.SectionId,
                        m.Section.Name
                    } : null,
                    User = m.User != null ? new
                    {
                        m.User.UserId,
                        m.User.Username
                    } : null
                })
                .ToListAsync();

            return Ok(result);
        }
    }
}