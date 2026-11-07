using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class OrderDetail
{
    public int OrderDetailId { get; set; }

    public int OrderId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    /// <summary>Precio realmente cobrado por unidad (puede diferir del catálogo, ver <see cref="ListPrice"/>).</summary>
    public decimal UnitPrice { get; set; }

    /// <summary>
    /// POS-07: precio de catálogo (Product.SalePrice) congelado al vender. Si difiere de
    /// <see cref="UnitPrice"/>, el cajero cambió el precio de la línea (descuento o recargo).
    /// </summary>
    public decimal ListPrice { get; set; }

    /// <summary>
    /// POS-07: descripción escrita por el cajero en ítems abiertos ("Otros"), p. ej. "Bombillo H4".
    /// Null en productos normales (se usa el nombre del producto).
    /// </summary>
    public string? Description { get; set; }

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
