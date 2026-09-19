using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class PurchaseDetail
{
    public int PurchaseDetailId { get; set; }

    public int ProductId { get; set; }

    public int PurchaseId { get; set; }

    public int SectionId { get; set; }

    public int Quantity { get; set; }

    public decimal PurchasePrice { get; set; }

    public decimal Subtotal { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Purchase Purchase { get; set; } = null!;

    public virtual Section Section { get; set; } = null!;
}
