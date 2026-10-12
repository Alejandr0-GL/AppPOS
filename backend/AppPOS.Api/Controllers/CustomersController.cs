using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq.Expressions;

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
        public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers([FromQuery] string? search)
        {
            var query = _context.Customers.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(c => c.Name.Contains(search) || c.DocumentNumber.Contains(search));
            }

            return await query.Select(ToDto()).ToListAsync();
        }

        // GET: api/Customers/search-by-document/123456789
        [HttpGet("search-by-document/{documentNumber}")]
        public async Task<ActionResult<CustomerDto>> GetByDocumentNumber(string documentNumber)
        {
            var customer = await _context.Customers
                .FirstOrDefaultAsync(c => c.DocumentNumber == documentNumber);

            if (customer == null)
            {
                return NotFound(new { message = "Cliente no encontrado con ese número de documento." });
            }

            return ToDto(customer);
        }

        // GET: api/Customers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
        {
            var customer = await _context.Customers.FindAsync(id);

            if (customer == null)
            {
                return NotFound();
            }

            return ToDto(customer);
        }

        // POST: api/Customers
        [HttpPost]
        public async Task<ActionResult<CustomerDto>> PostCustomer(CreateCustomerDto dto)
        {
            var validationError = Validate(dto.Name, dto.DocumentNumber, dto.DocumentType, dto.Address, dto.City);
            if (validationError != null) return BadRequest(new { message = validationError });
            // Validar que el número de documento no esté duplicado
            var exists = await _context.Customers.AnyAsync(c => c.DocumentNumber == dto.DocumentNumber);
            if (exists)
            {
                return BadRequest(new { message = "Ya existe un cliente registrado con ese número de documento." });
            }

            var customer = new Customer
            {
                Name = dto.Name.Trim(),
                DocumentNumber = dto.DocumentNumber.Trim(),
                DocumentType = dto.DocumentType.Trim().ToUpperInvariant(),
                Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim(),
                City = string.IsNullOrWhiteSpace(dto.City) ? "Medellín" : dto.City.Trim(),
                Department = string.IsNullOrWhiteSpace(dto.Department) ? "Antioquia" : dto.Department.Trim(),
                Phone = dto.Phone,
                Email = dto.Email
            };
            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCustomer), new { id = customer.CustomerId }, ToDto(customer));
        }

        // PUT: api/Customers/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutCustomer(int id, UpdateCustomerDto dto)
        {
            if (id != dto.CustomerId)
            {
                return BadRequest(new { message = "El ID del cliente no coincide." });
            }

            var existingCustomer = await _context.Customers.FindAsync(id);
            if (existingCustomer == null)
            {
                return NotFound();
            }

            var validationError = Validate(dto.Name, dto.DocumentNumber, dto.DocumentType, dto.Address, dto.City);
            if (validationError != null) return BadRequest(new { message = validationError });
            if (await _context.Customers.AnyAsync(c => c.CustomerId != id && c.DocumentNumber == dto.DocumentNumber)) return Conflict(new { message = "Ya existe un cliente registrado con ese número de documento." });

            existingCustomer.Name = dto.Name.Trim();
            existingCustomer.DocumentNumber = dto.DocumentNumber.Trim();
            existingCustomer.DocumentType = dto.DocumentType.Trim().ToUpperInvariant();
            existingCustomer.Address = string.IsNullOrWhiteSpace(dto.Address) ? null : dto.Address.Trim();
            existingCustomer.City = string.IsNullOrWhiteSpace(dto.City) ? "Medellín" : dto.City.Trim();
            existingCustomer.Department = string.IsNullOrWhiteSpace(dto.Department) ? "Antioquia" : dto.Department.Trim();
            existingCustomer.Phone = dto.Phone;
            existingCustomer.Email = dto.Email;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static string? Validate(string name, string documentNumber, string documentType, string? address, string? city)
        {
            var allowedTypes = new[] { "CC", "NIT", "CE", "PASSPORT" };
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(documentNumber)) return "Nombre y documento son obligatorios.";
            if (!allowedTypes.Contains(documentType.Trim().ToUpperInvariant())) return "El tipo de documento no es válido.";
            if (documentType.Trim().ToUpperInvariant() == "NIT" && (string.IsNullOrWhiteSpace(address) || string.IsNullOrWhiteSpace(city))) return "Dirección y ciudad son obligatorias para NIT.";
            return null;
        }

        private static CustomerDto ToDto(Customer customer) => new()
        {
            CustomerId = customer.CustomerId,
            Name = customer.Name,
            DocumentNumber = customer.DocumentNumber,
            DocumentType = customer.DocumentType,
            Address = customer.Address,
            City = customer.City,
            Department = customer.Department,
            Phone = customer.Phone,
            Email = customer.Email
        };

        private static Expression<Func<Customer, CustomerDto>> ToDto() => customer => new CustomerDto
        {
            CustomerId = customer.CustomerId,
            Name = customer.Name,
            DocumentNumber = customer.DocumentNumber,
            DocumentType = customer.DocumentType,
            Address = customer.Address,
            City = customer.City,
            Department = customer.Department,
            Phone = customer.Phone,
            Email = customer.Email
        };
    }
}