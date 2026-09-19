using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class StockMovement
{
    public int MovementId { get; set; }

    public int UserId { get; set; }

    public int ProductId { get; set; }

    public int SectionId { get; set; }

    public int Quantity { get; set; }

    public string MovementType { get; set; } = null!;

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Section Section { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
