using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class Order
{
    public int OrderId { get; set; }

    public int CustomerId { get; set; }

    public int SectionId { get; set; }

    public int UserId { get; set; }

    public int? CancelledByUserId { get; set; }

    public DateTime Date { get; set; }

    public decimal TotalAmount { get; set; }

    public string? PaymentMethod { get; set; }

    /// <summary>Efectivo entregado por el cliente al momento de la venta (solo pagos en efectivo).</summary>
    public decimal? ReceivedAmount { get; set; }

    /// <summary>Cambio/devuelta calculado por el servidor: ReceivedAmount - TotalAmount.</summary>
    public decimal? ChangeAmount { get; set; }

    public string InvoiceType { get; set; } = "POS";

    public string Status { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
