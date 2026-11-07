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

    /// <summary>
    /// POS-06: fecha en que se cobró una venta a crédito (PENDING → PAID). Null en ventas
    /// pagadas al momento (COMPLETED), cuyo ingreso se registra en <see cref="Date"/>.
    /// </summary>
    public DateTime? PaidAt { get; set; }

    /// <summary>
    /// POS-07: motivo opcional (uno por venta) cuando alguna línea se cobró a un precio distinto
    /// al de lista. Qué líneas cambiaron se sabe por OrderDetails.unit_price ≠ list_price.
    /// </summary>
    public string? PriceChangeReason { get; set; }

    public string InvoiceType { get; set; } = "POS";

    /// <summary>
    /// INV-01: placa del vehículo (opcional), normalizada en mayúsculas sin espacios ni guiones.
    /// Permite consultar el historial de un carro.
    /// </summary>
    public string? VehiclePlate { get; set; }

    /// <summary>
    /// INV-01: "a nombre de" quién sale la factura, tal como se escribió en la venta (congelado).
    /// No hace falta que el cliente esté guardado en Clientes: en ese caso <see cref="CustomerId"/>
    /// apunta a "Consumidor Final".
    /// </summary>
    public string CustomerName { get; set; } = null!;

    /// <summary>INV-01: documento (CC/NIT) del cliente guardado, congelado. Null en ventas sin cliente guardado.</summary>
    public string? CustomerDocument { get; set; }

    public string Status { get; set; } = null!;

    public virtual Customer Customer { get; set; } = null!;

    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
