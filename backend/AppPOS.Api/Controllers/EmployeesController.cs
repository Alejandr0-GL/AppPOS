using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeesController : ControllerBase
    {
        private readonly AppPosDbContext _context;

        public EmployeesController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Employees?includeInactive=false
        [HttpGet]
        public async Task<IActionResult> GetEmployees([FromQuery] bool includeInactive = false)
        {
            var query = _context.Employees.AsNoTracking().AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(employee => employee.IsActive);
            }

            var employees = await query
                .OrderBy(employee => employee.Name)
                .Select(employee => new EmployeeDto
                {
                    EmployeeId = employee.EmployeeId,
                    Name = employee.Name,
                    Phone = employee.Phone,
                    Role = employee.Role,
                    IsActive = employee.IsActive
                })
                .ToListAsync();

            return Ok(employees);
        }

        // GET: api/Employees/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetEmployee(int id)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(item => item.EmployeeId == id);

            if (employee == null)
            {
                return NotFound(new { message = "Empleado no encontrado." });
            }

            return Ok(ToDto(employee));
        }

        // POST: api/Employees
        [HttpPost]
        public async Task<IActionResult> PostEmployee([FromBody] CreateEmployeeDto dto)
        {
            var validationError = ValidateEmployee(dto.Name, dto.Phone, dto.Role);
            if (validationError != null) return BadRequest(new { message = validationError });

            var employee = new Employee
            {
                Name = dto.Name.Trim(),
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
                Role = string.IsNullOrWhiteSpace(dto.Role) ? null : dto.Role.Trim(),
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEmployee), new { id = employee.EmployeeId }, ToDto(employee));
        }

        // PUT: api/Employees/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> PutEmployee(int id, [FromBody] UpdateEmployeeDto dto)
        {
            if (id != dto.EmployeeId)
            {
                return BadRequest(new { message = "El ID del empleado no coincide." });
            }

            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound(new { message = "Empleado no encontrado." });
            }

            var validationError = ValidateEmployee(dto.Name, dto.Phone, dto.Role);
            if (validationError != null) return BadRequest(new { message = validationError });

            employee.Name = dto.Name.Trim();
            employee.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim();
            employee.Role = string.IsNullOrWhiteSpace(dto.Role) ? null : dto.Role.Trim();
            employee.IsActive = dto.IsActive;
            employee.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Empleado actualizado correctamente." });
        }

        // DELETE: api/Employees/5 (soft delete)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound(new { message = "Empleado no encontrado." });
            }

            employee.IsActive = false;
            employee.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Empleado desactivado correctamente." });
        }

        // GET: api/Employees/5/commissions?startDate=2026-10-01&endDate=2026-10-31
        [HttpGet("{id:int}/commissions")]
        public async Task<IActionResult> GetCommissions(
            int id,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(item => item.EmployeeId == id);

            if (employee == null)
            {
                return NotFound(new { message = "Empleado no encontrado." });
            }

            var resolvedEnd = (endDate ?? DateTime.Today).Date;
            var resolvedStart = (startDate ?? resolvedEnd.AddDays(-29)).Date;

            if (resolvedStart > resolvedEnd)
            {
                return BadRequest(new { message = "La fecha inicial no puede ser mayor que la fecha final." });
            }

            var endExclusive = resolvedEnd.AddDays(1);

            var rows = await (
                from detail in _context.OrderDetails.AsNoTracking()
                join order in _context.Orders.AsNoTracking() on detail.OrderId equals order.OrderId
                join product in _context.Products.AsNoTracking() on detail.ProductId equals product.ProductId
                join customer in _context.Customers.AsNoTracking() on order.CustomerId equals customer.CustomerId
                where detail.EmployeeId == id
                    && order.Status == "COMPLETED"
                    && order.Date >= resolvedStart
                    && order.Date < endExclusive
                select new
                {
                    order.OrderId,
                    detail.OrderDetailId,
                    order.Date,
                    product.Name,
                    product.Sku,
                    product.IsService,
                    detail.Quantity,
                    detail.UnitPrice,
                    detail.AppliedCommissionPercentage,
                    detail.CommissionAmount,
                    detail.AppliedBusinessProfitPercentage,
                    detail.LocalProfitAmount,
                    CustomerName = customer.Name
                }).ToListAsync();

            var items = rows
                .Select(row =>
                {
                    // Comisión y ganancia local congeladas al momento de la venta.
                    var percentage = row.AppliedCommissionPercentage;

                    return new EmployeeCommissionItemDto
                    {
                        OrderId = row.OrderId,
                        OrderDetailId = row.OrderDetailId,
                        Date = row.Date,
                        ItemName = row.Name,
                        Sku = row.Sku,
                        CustomerName = row.CustomerName,
                        IsService = row.IsService,
                        Quantity = row.Quantity,
                        TotalSale = row.UnitPrice * row.Quantity,
                        CommissionPercentage = percentage,
                        CommissionAmount = Math.Round(row.CommissionAmount * row.Quantity, 2),
                        BusinessProfitPercentage = row.AppliedBusinessProfitPercentage,
                        LocalProfitAmount = Math.Round(row.LocalProfitAmount * row.Quantity, 2)
                    };
                })
                .OrderBy(item => item.Date)
                .ThenBy(item => item.OrderId)
                .ToList();

            var report = new EmployeeCommissionReportDto
            {
                EmployeeId = employee.EmployeeId,
                EmployeeName = employee.Name,
                StartDate = resolvedStart,
                EndDate = resolvedEnd,
                TotalSales = Math.Round(items.Sum(item => item.TotalSale), 2),
                TotalCommission = Math.Round(items.Sum(item => item.CommissionAmount), 2),
                TotalLocalProfit = Math.Round(items.Sum(item => item.LocalProfitAmount), 2),
                Items = items
            };

            return Ok(report);
        }

        private static string? ValidateEmployee(string name, string? phone, string? role)
        {
            if (string.IsNullOrWhiteSpace(name)) return "El nombre del empleado es obligatorio.";
            if (name.Trim().Length > 100) return "El nombre no puede superar 100 caracteres.";
            if (!string.IsNullOrWhiteSpace(phone) && phone.Trim().Length > 20) return "El teléfono no puede superar 20 caracteres.";
            if (!string.IsNullOrWhiteSpace(role) && role.Trim().Length > 50) return "El cargo no puede superar 50 caracteres.";
            return null;
        }

        private static EmployeeDto ToDto(Employee employee) => new()
        {
            EmployeeId = employee.EmployeeId,
            Name = employee.Name,
            Phone = employee.Phone,
            Role = employee.Role,
            IsActive = employee.IsActive
        };
    }
}
