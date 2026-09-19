using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AppPOS.Api.Models;

public partial class Section
{
    public int SectionId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    [JsonIgnore]
    public virtual ICollection<Inventory> Inventories { get; set; } = new List<Inventory>();

    [JsonIgnore]
    public virtual ICollection<PurchaseDetail> PurchaseDetails { get; set; } = new List<PurchaseDetail>();

    [JsonIgnore]
    public virtual ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}
