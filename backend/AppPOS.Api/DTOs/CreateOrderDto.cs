namespace AppPOS.Api.DTOs
{
    public class CreateOrderDetailDto
    {
        public int ProductId { get; set; }
        public int SectionId { get; set; } // Necesario para identificar de qué ubicación descontar stock
        public int Quantity { get; set; }
        /// <summary>Informativo: el servidor NO lo usa (toma Product.SalePrice). Para cambiar el precio usar <see cref="PriceOverride"/>.</summary>
        public decimal UnitPrice { get; set; }
        public decimal TaxAmount { get; set; }
        public int? EmployeeId { get; set; } // Técnico/empleado asignado (opcional)

        /// <summary>
        /// POS-07: precio unitario distinto al de catálogo, elegido explícitamente por el cajero.
        /// Null = cobrar el precio de catálogo actual. Debe ser mayor a 0.
        /// </summary>
        public decimal? PriceOverride { get; set; }

        /// <summary>POS-07: sólo ítems abiertos ("Otros"): descripción obligatoria (máx. 150).</summary>
        public string? Description { get; set; }

        /// <summary>
        /// POS-07: sólo ítems abiertos ("Otros"): costo unitario opcional (default 0). Se congela en
        /// unit_cost y es la base de comisión/ganancia. El precio no puede ser menor a este costo.
        /// </summary>
        public decimal? UnitCost { get; set; }
    }

    public class CreateOrderDto
    {
        public int UserId { get; set; } // Identifica al cajero/usuario que realiza la venta

        /// <summary>
        /// Cliente guardado (frecuente). INV-01: opcional; si no se envía, la venta queda en
        /// "Consumidor Final" con el nombre/documento escritos en <see cref="CustomerName"/>.
        /// </summary>
        public int? CustomerId { get; set; }

        /// <summary>INV-01: "a nombre de" (≤ 100). Si se omite, se usa el nombre del cliente o "Consumidor final".</summary>
        public string? CustomerName { get; set; }

        /// <summary>INV-01: documento CC/NIT (≤ 30), opcional. El POS no lo pide: sale del cliente guardado.</summary>
        public string? CustomerDocument { get; set; }

        /// <summary>INV-01: placa del vehículo (opcional). Se normaliza a mayúsculas sin espacios ni guiones.</summary>
        public string? VehiclePlate { get; set; }
        public int SectionId { get; set; }
        public string? PaymentMethod { get; set; }

        // Efectivo entregado por el cliente (opcional, solo pagos en efectivo).
        // El cambio SIEMPRE lo calcula el servidor para evitar manipulación desde el cliente.
        public decimal? ReceivedAmount { get; set; }

        // POS = Venta normal/remisión | ELECTRONIC = Factura Electrónica
        public string InvoiceType { get; set; } = "POS";
        public List<CreateOrderDetailDto> Details { get; set; } = new();

        /// <summary>
        /// POS-07: motivo opcional del ajuste de precio (uno por venta, máx. 200). Sólo se guarda
        /// si alguna línea trae un PriceOverride distinto al precio de lista.
        /// </summary>
        public string? PriceChangeReason { get; set; }
    }

    public class CancelOrderDto
    {
        public int UserId { get; set; }
    }

    // PATCH api/Orders/{id}/pay — registro del pago de una venta a crédito (POS-06)
    public class OrderPaymentDto
    {
        /// <summary>Método de pago final: CASH o TRANSFER.</summary>
        public string? PaymentMethod { get; set; }

        /// <summary>Efectivo entregado por el cliente (solo CASH). El cambio lo calcula el servidor.</summary>
        public decimal? ReceivedAmount { get; set; }
    }
}
