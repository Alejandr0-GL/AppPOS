using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class Inventory
{
    public int InventoryId { get; set; }

    public int ProductId { get; set; }

    public int SectionId { get; set; }

    public int CurrentStock { get; set; }

    public int MinStock { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Product Product { get; set; } = null!;

    public virtual Section Section { get; set; } = null!;
}
