using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class Tax
{
    public int TaxId { get; set; }

    public string Name { get; set; } = null!;

    public decimal Percentage { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
