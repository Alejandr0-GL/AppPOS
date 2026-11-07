namespace AppPOS.Api.Models;

/// <summary>
/// EXP-01: egreso de dinero. <see cref="Scope"/> separa los gastos operativos del negocio
/// (BUSINESS) de los retiros / gastos del hogar (PERSONAL), para analizar el flujo de caja
/// y calcular la ganancia neta real del negocio.
/// </summary>
public partial class Expense
{
    public int ExpenseId { get; set; }

    /// <summary>Usuario que registró el gasto (sin autenticación aún: el frontend envía 1).</summary>
    public int UserId { get; set; }

    public decimal Amount { get; set; }

    /// <summary>Categoría (p. ej. "Arriendo", "Mercado"). Texto libre con sugerencias por ámbito.</summary>
    public string Category { get; set; } = null!;

    /// <summary><c>BUSINESS</c> (negocio) o <c>PERSONAL</c> (personal / familiar).</summary>
    public string Scope { get; set; } = null!;

    /// <summary><c>CASH</c>, <c>TRANSFER</c> o <c>CARD</c>.</summary>
    public string PaymentMethod { get; set; } = null!;

    public string? Description { get; set; }

    /// <summary>Fecha en que se hizo el gasto (sólo fecha; puede ser anterior al registro).</summary>
    public DateTime Date { get; set; }

    /// <summary>Momento en que se registró en el sistema (auditoría).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// EXP-02: unidad de negocio (Lubricentro / Tienda) dueña del gasto. Las unidades son
    /// independientes: cada una lleva sus propios gastos, tanto del negocio como personales.
    /// </summary>
    public int SectionId { get; set; }

    /// <summary>EXP-02: última edición del gasto (NULL si nunca se editó).</summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>EXP-02: un gasto anulado no se borra (trazabilidad) pero deja de sumar en los totales.</summary>
    public bool IsVoided { get; set; }

    public DateTime? VoidedAt { get; set; }

    /// <summary>Motivo opcional de la anulación.</summary>
    public string? VoidReason { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Section Section { get; set; } = null!;
}
