namespace AppPOS.Api.DTOs
{
    public class CreateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string? Description { get; set; }
        public int CategoryId { get; set; }
        public int TaxId { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public int SectionId { get; set; }
        public int InitialStock { get; set; }
        public int MinStock { get; set; } = 5;
    }

    public class UpdateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string? Description { get; set; }
        public int CategoryId { get; set; }
        public int TaxId { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal SalePrice { get; set; }
        public bool IsActive { get; set; }
    }
}
