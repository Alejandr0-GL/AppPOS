using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SectionsController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public SectionsController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Sections
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Section>>> GetSections()
        {
            return await _context.Sections.ToListAsync();
        }

        // GET: api/Sections/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Section>> GetSection(int id)
        {
            var section = await _context.Sections.FindAsync(id);

            if (section == null)
            {
                return NotFound();
            }

            return section;
        }

        // POST: api/Sections
        [HttpPost]
        public async Task<ActionResult<Section>> PostSection(Section section)
        {
            _context.Sections.Add(section);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSection), new { id = section.SectionId }, section);
        }

        // PUT: api/Sections/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSection(int id, Section section)
        {
            if (id != section.SectionId)
            {
                return BadRequest();
            }

            _context.Entry(section).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Sections.Any(e => e.SectionId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Sections/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSection(int id)
        {
            var section = await _context.Sections.FindAsync(id);
            if (section == null)
            {
                return NotFound();
            }

            _context.Sections.Remove(section);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
