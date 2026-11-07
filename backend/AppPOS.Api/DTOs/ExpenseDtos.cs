namespace AppPOS.Api.DTOs
{
    // EXP-01: gastos del negocio y personales / familiares.
    // EXP-02: edición, anulación y unidad de negocio.

    /// <summary>Cuerpo de POST (crear) y PUT (editar) de un gasto. En la edición se ignora <see cref="UserId"/>.</summary>
    public class CreateExpenseDto
    {
        public int UserId { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        /// <summary>BUSINESS | PERSONAL (acepta alias NEGOCIO / FAMILIAR).</summary>
        public string Scope { get; set; } = string.Empty;
        /// <summary>EXP-02: unidad de negocio dueña del gasto (obligatoria en ambos ámbitos).</summary>
        public int? SectionId { get; set; }
        /// <summary>CASH | TRANSFER | CARD (acepta alias EFECTIVO / TRANSFERENCIA / TARJETA).</summary>
        public string PaymentMethod { get; set; } = string.Empty;
        public string? Description { get; set; }
        /// <summary>Fecha del gasto; si no se envía, hoy. No puede ser futura.</summary>
        public DateTime? Date { get; set; }
    }

    /// <summary>EXP-02: cuerpo de PUT api/Expenses/{id}/void.</summary>
    public class VoidExpenseDto
    {
        public string? Reason { get; set; }
    }

    public class ExpenseDto
    {
        public int ExpenseId { get; set; }
        public int UserId { get; set; }
        public string? Username { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Scope { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public string? SectionName { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime Date { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsVoided { get; set; }
        public DateTime? VoidedAt { get; set; }
        public string? VoidReason { get; set; }
    }

    public class ExpenseCategoryTotalDto
    {
        public string Scope { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public int Count { get; set; }
    }

    public class ExpenseSummaryDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal BusinessTotal { get; set; }
        public int BusinessCount { get; set; }
        public decimal PersonalTotal { get; set; }
        public int PersonalCount { get; set; }
        /// <summary>Total de egresos del período (negocio + personal). Excluye anulados.</summary>
        public decimal Total { get; set; }
        public int Count { get; set; }
        /// <summary>Totales por ámbito y categoría, de mayor a menor.</summary>
        public List<ExpenseCategoryTotalDto> ByCategory { get; set; } = new();
    }
}
