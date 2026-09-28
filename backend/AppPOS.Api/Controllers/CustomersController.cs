using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomersController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public CustomersController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Customers
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers([FromQuery] string? search)
        {
            var query = _context.Customers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.Name.Contains(search) || c.DocumentNumber.Contains(search));
            }

            return await query.ToListAsync();
        }

        // GET: api/Customers/search-by-document/123456789
        [HttpGet("search-by-document/{documentNumber}")]
        public async Task<ActionResult<Customer>> GetByDocumentNumber(string documentNumber)
        {
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.DocumentNumber == documentNumber);

            if (customer == null)
            {
                return NotFound(new { message = "Cliente no encontrado con ese número de documento." });
            }

            return customer;
        }

        // GET: api/Customers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Customer>> GetCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);

            if (customer == null)
            {
                return NotFound();
            }

            return customer;
        }

        // POST: api/Customers
        [HttpPost]
        public async Task<ActionResult<Customer>> PostCustomer(Customer customer)
        {
            // Validar que el número de documento no esté duplicado
            var exists = await _context.Customers.AnyAsync(c => c.DocumentNumber == customer.DocumentNumber);
            if (exists)
            {
                return BadRequest(new { message = "Ya existe un cliente registrado con ese número de documento." });
            }

            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomer), new { id = customer.CustomerId }, customer);
        }

        // PUT: api/Customers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCustomer(int id, Customer customer)
        {
            if (id != customer.CustomerId)
            {
                return BadRequest(new { message = "El ID del cliente no coincide." });
            }

            var existingCustomer = await _context.Customers.FindAsync(id);
            if (existingCustomer == null)
            {
                return NotFound();
            }

            existingCustomer.Name = customer.Name;
            existingCustomer.DocumentNumber = customer.DocumentNumber;
            existingCustomer.Phone = customer.Phone;
            existingCustomer.Email = customer.Email;

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}