namespace AppPOS.Api.DTOs
{
    public class CreatePurchaseDetailDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal PurchasePrice { get; set; }
    }

    public class CreatePurchaseDto
    {
        public int UserId { get; set; }
        public int SupplierId { get; set; }
        public string? InvoiceNumber { get; set; }
        public int SectionId { get; set; }
        public string? Observations { get; set; }
        public List<CreatePurchaseDetailDto> Details { get; set; } = new();
    }

    public class CancelPurchaseDto
    {
        public int UserId { get; set; }
    }
}
