using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class OrderDetail
{
    public int OrderDetailId { get; set; }

    public int OrderId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal UnitCost { get; set; }

    public int? EmployeeId { get; set; }

    public decimal AppliedCommissionPercentage { get; set; }

    public decimal CommissionAmount { get; set; }

    public decimal AppliedBusinessProfitPercentage { get; set; }

    public decimal LocalProfitAmount { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal Subtotal { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual Employee? Employee { get; set; }
}
