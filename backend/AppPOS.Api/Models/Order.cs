using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class Order
{
    public int OrderId { get; set; }

    public int CustomerId { get; set; }

    public DateTime Date { get; set; }

    public decimal TotalAmount { get; set; }

    public string? PaymentMethod { get; set; }

    public string Status { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
