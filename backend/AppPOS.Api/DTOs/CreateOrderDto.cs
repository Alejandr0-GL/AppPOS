namespace AppPOS.Api.DTOs
{
    public class CreateOrderDetailDto
    {
        public int ProductId { get; set; }
        public int SectionId { get; set; } // Necesario para identificar de qué ubicación descontar stock
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxAmount { get; set; }
    }

    public class CreateOrderDto
    {
        public int UserId { get; set; } // Identifica al cajero/usuario que realiza la venta
        public int CustomerId { get; set; }
        public string? PaymentMethod { get; set; }

        // POS = Venta normal/remisión | ELECTRONIC = Factura Electrónica
        public string InvoiceType { get; set; } = "POS";
        public List<CreateOrderDetailDto> Details { get; set; } = new();
    }
}
