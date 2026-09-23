using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaxesController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public TaxesController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Taxes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tax>>> GetTaxes()
        {
            return await _context.Taxes.ToListAsync();
        }

        // GET: api/Taxes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Tax>> GetTax(int id)
        {
            var tax = await _context.Taxes.FindAsync(id);

            if (tax == null)
            {
                return NotFound();
            }

            return tax;
        }

        // POST: api/Taxes
        [HttpPost]
        public async Task<ActionResult<Tax>> PostTax(Tax tax)
        {

            if (tax.Percentage < 0 || tax.Percentage > 100)
            {
                return BadRequest("Percentage must be between 0 and 100");
            }

            bool nameExists = await _context.Taxes.AnyAsync(t => t.Name.ToLower() == tax.Name.ToLower());
            if (nameExists)
            {
                return BadRequest($"There is another tax with that name '{tax.Name}'.");
            }

            _context.Taxes.Add(tax);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTax), new { id = tax.TaxId }, tax);
        }

        // PUT: api/Taxes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTaxes(int id, Tax tax)
        {
            if (id != tax.TaxId)
            {
                return BadRequest("The ID in the URL does not match the entity ID.");
            }

            var existingTax = await _context.Taxes.FindAsync(id);
            if (existingTax == null)
            {
                return NotFound();
            }

            if (tax.Percentage < 0 || tax.Percentage > 100)
            {
                return BadRequest("Percentage must be between 0 and 100.");
            }

            bool nameExists = await _context.Taxes.AnyAsync(t => t.Name.ToLower() == tax.Name.ToLower() && t.TaxId != id);
            if (nameExists)
            {
                return BadRequest($"There is another tax with the name '{tax.Name}'.");
            }

            if (existingTax.IsActive && !tax.IsActive)
            {
                bool isTaxInUse = await _context.Products.AnyAsync(p => p.TaxId == id);
                if (isTaxInUse)
                {
                    return BadRequest($"The tax '{tax.Name}' is being used by active products and cannot be deactivated. Reassign those products first.");
                }
            }

            existingTax.Name = tax.Name;
            existingTax.Percentage = tax.Percentage;
            existingTax.IsActive = tax.IsActive;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Taxes.Any(e => e.TaxId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/Taxes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTax(int id)
        {
            var tax = await _context.Taxes.FindAsync(id);
            if (tax == null)
            {
                return NotFound();
            }

            bool isTaxInUse = await _context.Products.AnyAsync(p => p.TaxId == id);
            if (isTaxInUse)
            {
                return BadRequest("Tax is being used. It cannot be deleted");
            }

            _context.Taxes.Remove(tax);
            await _context.SaveChangesAsync();

            return NoContent();
        }

    }
}
