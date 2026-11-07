using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppPOS.Api.Controllers
{
    /// <summary>
    /// EXP-01: registro y consulta de gastos del negocio (BUSINESS) y personales / familiares (PERSONAL).
    /// EXP-02: edición, anulación (sin borrado físico) y unidad de negocio dueña de cada gasto.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class ExpensesController : ControllerBase
    {
        private static readonly Dictionary<string, string> ScopeAliases = new(StringComparer.OrdinalIgnoreCase)
        {
            ["BUSINESS"] = "BUSINESS",
            ["NEGOCIO"] = "BUSINESS",
            ["PERSONAL"] = "PERSONAL",
            ["FAMILIAR"] = "PERSONAL",
            ["FAMILY"] = "PERSONAL"
        };

        private static readonly Dictionary<string, string> PaymentAliases = new(StringComparer.OrdinalIgnoreCase)
        {
            ["CASH"] = "CASH",
            ["EFECTIVO"] = "CASH",
            ["TRANSFER"] = "TRANSFER",
            ["TRANSFERENCIA"] = "TRANSFER",
            ["CARD"] = "CARD",
            ["TARJETA"] = "CARD"
        };

        private readonly AppPosDbContext _context;

        public ExpensesController(AppPosDbContext context)
        {
            _context = context;
        }

        // GET: api/Expenses?startDate=2026-11-01&endDate=2026-11-30&scope=BUSINESS&category=Arriendo&sectionId=1&includeVoided=true
        [HttpGet]
        public async Task<IActionResult> GetExpenses(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? scope,
            [FromQuery] string? category,
            [FromQuery] int? sectionId,
            [FromQuery] bool includeVoided = false)
        {
            var (query, error) = BuildFilteredQuery(startDate, endDate, scope, category, sectionId);
            if (error != null) return BadRequest(new { message = error });

            if (!includeVoided)
                query = query.Where(expense => !expense.IsVoided);

            var expenses = await query
                .OrderByDescending(expense => expense.Date)
                .ThenByDescending(expense => expense.CreatedAt)
                .Select(expense => new ExpenseDto
                {
                    ExpenseId = expense.ExpenseId,
                    UserId = expense.UserId,
                    Username = expense.User.Username,
                    Amount = expense.Amount,
                    Category = expense.Category,
                    Scope = expense.Scope,
                    SectionId = expense.SectionId,
                    SectionName = expense.Section.Name,
                    PaymentMethod = expense.PaymentMethod,
                    Description = expense.Description,
                    Date = expense.Date,
                    CreatedAt = expense.CreatedAt,
                    UpdatedAt = expense.UpdatedAt,
                    IsVoided = expense.IsVoided,
                    VoidedAt = expense.VoidedAt,
                    VoidReason = expense.VoidReason
                })
                .ToListAsync();

            return Ok(expenses);
        }

        // GET: api/Expenses/summary?startDate=2026-11-01&endDate=2026-11-30
        // Mismos filtros que el listado: las tarjetas siempre cuadran con la tabla.
        // Los gastos anulados nunca suman.
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? scope,
            [FromQuery] string? category,
            [FromQuery] int? sectionId)
        {
            var (query, error) = BuildFilteredQuery(startDate, endDate, scope, category, sectionId);
            if (error != null) return BadRequest(new { message = error });

            query = query.Where(expense => !expense.IsVoided);

            var byCategory = await query
                .GroupBy(expense => new { expense.Scope, expense.Category })
                .Select(group => new ExpenseCategoryTotalDto
                {
                    Scope = group.Key.Scope,
                    Category = group.Key.Category,
                    Total = group.Sum(expense => expense.Amount),
                    Count = group.Count()
                })
                .ToListAsync();

            var business = byCategory.Where(item => item.Scope == "BUSINESS").ToList();
            var personal = byCategory.Where(item => item.Scope == "PERSONAL").ToList();

            var summary = new ExpenseSummaryDto
            {
                StartDate = startDate?.Date,
                EndDate = endDate?.Date,
                BusinessTotal = business.Sum(item => item.Total),
                BusinessCount = business.Sum(item => item.Count),
                PersonalTotal = personal.Sum(item => item.Total),
                PersonalCount = personal.Sum(item => item.Count),
                ByCategory = byCategory.OrderByDescending(item => item.Total).ToList()
            };
            summary.Total = summary.BusinessTotal + summary.PersonalTotal;
            summary.Count = summary.BusinessCount + summary.PersonalCount;

            return Ok(summary);
        }

        // POST: api/Expenses
        [HttpPost]
        public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseDto dto)
        {
            var (values, error) = await ValidateAsync(dto);
            if (error != null) return BadRequest(new { message = error });

            if (!await _context.Users.AnyAsync(user => user.UserId == dto.UserId))
                return BadRequest(new { message = "El usuario que registra el gasto no existe." });

            var expense = new Expense
            {
                UserId = dto.UserId,
                CreatedAt = DateTime.Now
            };
            values!.ApplyTo(expense);

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetExpenses), null, new
            {
                message = "Gasto registrado correctamente.",
                expenseId = expense.ExpenseId
            });
        }

        // PUT: api/Expenses/5 — EXP-02: corrige un gasto mal registrado. Conserva quién y cuándo lo registró.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] CreateExpenseDto dto)
        {
            var expense = await _context.Expenses.FirstOrDefaultAsync(item => item.ExpenseId == id);
            if (expense == null)
                return NotFound(new { message = "Gasto no encontrado." });
            if (expense.IsVoided)
                return Conflict(new { message = "El gasto está anulado y no se puede editar." });

            var (values, error) = await ValidateAsync(dto);
            if (error != null) return BadRequest(new { message = error });

            values!.ApplyTo(expense);
            expense.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Gasto actualizado correctamente.", expenseId = expense.ExpenseId });
        }

        // PUT: api/Expenses/5/void — EXP-02: anulación lógica. El gasto queda en el historial pero deja de sumar.
        [HttpPut("{id:int}/void")]
        public async Task<IActionResult> VoidExpense(int id, [FromBody] VoidExpenseDto? dto)
        {
            var expense = await _context.Expenses.FirstOrDefaultAsync(item => item.ExpenseId == id);
            if (expense == null)
                return NotFound(new { message = "Gasto no encontrado." });
            if (expense.IsVoided)
                return Conflict(new { message = "El gasto ya fue anulado." });

            var reason = dto?.Reason?.Trim();
            if (reason?.Length > 250)
                return BadRequest(new { message = "El motivo de anulación no puede superar 250 caracteres." });

            expense.IsVoided = true;
            expense.VoidedAt = DateTime.Now;
            expense.VoidReason = string.IsNullOrWhiteSpace(reason) ? null : reason;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Gasto anulado correctamente.", expenseId = expense.ExpenseId });
        }

        /// <summary>Valores ya normalizados y validados de un gasto (comunes a crear y editar).</summary>
        private sealed record ExpenseValues(
            decimal Amount, string Category, string Scope, int SectionId,
            string PaymentMethod, string? Description, DateTime Date)
        {
            public void ApplyTo(Expense expense)
            {
                expense.Amount = Amount;
                expense.Category = Category;
                expense.Scope = Scope;
                expense.SectionId = SectionId;
                expense.PaymentMethod = PaymentMethod;
                expense.Description = Description;
                expense.Date = Date;
            }
        }

        private async Task<(ExpenseValues? Values, string? Error)> ValidateAsync(CreateExpenseDto dto)
        {
            if (dto.Amount <= 0m)
                return (null, "El monto del gasto debe ser mayor a 0.");

            if (!ScopeAliases.TryGetValue(dto.Scope?.Trim() ?? string.Empty, out var scope))
                return (null, "Selecciona el ámbito del gasto: Negocio o Personal / Familiar.");

            // EXP-02: cada unidad de negocio es independiente y lleva sus propios gastos (negocio y personales).
            if (dto.SectionId is not int sectionId)
                return (null, "Selecciona la unidad de negocio a la que corresponde el gasto.");
            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId && section.IsActive))
                return (null, "La unidad de negocio seleccionada no existe o está inactiva.");

            var category = dto.Category?.Trim();
            if (string.IsNullOrWhiteSpace(category))
                return (null, "Selecciona o escribe la categoría del gasto.");
            if (category.Length > 60)
                return (null, "La categoría no puede superar 60 caracteres.");

            if (!PaymentAliases.TryGetValue(dto.PaymentMethod?.Trim() ?? string.Empty, out var paymentMethod))
                return (null, "Método de pago no válido. Usa Efectivo, Transferencia o Tarjeta.");

            var description = dto.Description?.Trim();
            if (description?.Length > 250)
                return (null, "La descripción no puede superar 250 caracteres.");

            var date = (dto.Date ?? DateTime.Today).Date;
            if (date > DateTime.Today)
                return (null, "La fecha del gasto no puede ser futura.");

            return (new ExpenseValues(
                Math.Round(dto.Amount, 2),
                category,
                scope,
                sectionId,
                paymentMethod,
                string.IsNullOrWhiteSpace(description) ? null : description,
                date), null);
        }

        private (IQueryable<Expense> Query, string? Error) BuildFilteredQuery(
            DateTime? startDate, DateTime? endDate, string? scope, string? category, int? sectionId)
        {
            if (startDate.HasValue && endDate.HasValue && startDate.Value.Date > endDate.Value.Date)
                return (_context.Expenses, "La fecha inicial no puede ser mayor que la fecha final.");

            var query = _context.Expenses.AsNoTracking();

            if (startDate.HasValue)
            {
                var from = startDate.Value.Date;
                query = query.Where(expense => expense.Date >= from);
            }

            if (endDate.HasValue)
            {
                var to = endDate.Value.Date;
                query = query.Where(expense => expense.Date <= to);
            }

            if (!string.IsNullOrWhiteSpace(scope))
            {
                if (!ScopeAliases.TryGetValue(scope.Trim(), out var normalizedScope))
                    return (query, "Ámbito no válido. Usa BUSINESS o PERSONAL.");
                query = query.Where(expense => expense.Scope == normalizedScope);
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalizedCategory = category.Trim();
                query = query.Where(expense => expense.Category == normalizedCategory);
            }

            // EXP-02: el frontend siempre envía la unidad seleccionada (las unidades son independientes).
            if (sectionId.HasValue)
            {
                var section = sectionId.Value;
                query = query.Where(expense => expense.SectionId == section);
            }

            return (query, null);
        }
    }
}
