using AppPOS.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public CategoriesController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Categories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] int sectionId, [FromQuery] bool includeInactive = false)
        {
            if (sectionId <= 0) return BadRequest(new { message = "sectionId es obligatorio para consultar categorías." });
            var query = _context.Categories
                .Where(category => category.SectionId == sectionId);
            if (!includeInactive) query = query.Where(category => category.IsActive);
            return await query
                .OrderBy(category => category.Name)
                .ToListAsync();
        }

        // GET: api/Categories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Category>> GetCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);

            if (category == null)
            {
                return NotFound();
            }

            return category;
        }

        // POST: api/Categories
        [HttpPost]
        public async Task<ActionResult<Category>> PostCategory(Category category)
        {
            if (category.SectionId <= 0) return BadRequest(new { message = "La sección de la categoría es obligatoria." });
            if (string.IsNullOrWhiteSpace(category.Name)) return BadRequest(new { message = "El nombre de la categoría es obligatorio." });
            if (await _context.Categories.AnyAsync(item => item.SectionId == category.SectionId && item.Name == category.Name))
                return Conflict(new { message = "Ya existe una categoría con ese nombre en la unidad seleccionada." });

            category.Name = category.Name.Trim();
            category.IsActive = true;
            _context.Categories.Add(category);
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException) { return Conflict(new { message = "No se pudo crear la categoría porque ya existe en la unidad seleccionada." }); }

            return CreatedAtAction(nameof(GetCategory), new { id = category.CategoryId }, category);
        }

        // PUT: api/Categories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCategory(int id, Category category)
        {
            if (id != category.CategoryId)
            {
                return BadRequest();
            }

            var existing = await _context.Categories.FindAsync(id);
            if (existing == null) return NotFound();
            if (category.SectionId != existing.SectionId) return BadRequest(new { message = "No se puede cambiar la unidad de una categoría." });
            if (string.IsNullOrWhiteSpace(category.Name)) return BadRequest(new { message = "El nombre de la categoría es obligatorio." });
            if (await _context.Categories.AnyAsync(item => item.CategoryId != id && item.SectionId == existing.SectionId && item.Name == category.Name))
                return Conflict(new { message = "Ya existe una categoría con ese nombre en la unidad seleccionada." });

            existing.Name = category.Name.Trim();
            existing.Description = category.Description;
            existing.IsActive = category.IsActive;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Categories.Any(e => e.CategoryId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Categories/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            category.IsActive = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

}
