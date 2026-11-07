using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AppPOS.Api.Models;

public partial class Purchase
{
    public int PurchaseId { get; set; }

    public int UserId { get; set; }

    public int SupplierId { get; set; }

    public DateTime Date { get; set; }

    public string? InvoiceNumber { get; set; }

    public decimal TotalAmount { get; set; }

    public string? Observations { get; set; }

    public string Status { get; set; } = null!;

    /// <summary>SEC-01: usuario que anuló la compra (NULL si no está anulada o es anterior a SEC-01).</summary>
    public int? CancelledByUserId { get; set; }

    public virtual ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();

    [JsonIgnore]
    public virtual Supplier? Supplier { get; set; }

    [JsonIgnore]
    public virtual User? User { get; set; }
}
