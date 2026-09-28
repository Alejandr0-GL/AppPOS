using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AppPOS.Api.Models;

public partial class Customer
{
    public int CustomerId { get; set; }

    public string Name { get; set; } = null!;

    public string DocumentNumber { get; set; } = null!;

    public string? Phone { get; set; }

    public string? Email { get; set; }

    [JsonIgnore]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
