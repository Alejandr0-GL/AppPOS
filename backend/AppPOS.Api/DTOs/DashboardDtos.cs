namespace AppPOS.Api.DTOs
{
    public class DashboardSummaryDto
    {
        public int ActiveProducts { get; set; }
        public int TotalUnits { get; set; }
        public decimal CostValue { get; set; }
        public decimal SaleValue { get; set; }
        public decimal PotentialProfit { get; set; }
        public int LowStockCount { get; set; }
        public int OutOfStockCount { get; set; }
        public decimal TodaySalesTotal { get; set; }
        public int TodayOrdersCount { get; set; }
    }

    public class SalesTrendPointDto
    {
        public DateTime Date { get; set; }
        public decimal Total { get; set; }
    }

    public class CategoryDistributionItemDto
    {
        public string Category { get; set; } = string.Empty;
        public decimal CostValue { get; set; }
        public decimal SaleValue { get; set; }
        public int TotalUnits { get; set; }
        public int ProductCount { get; set; }
    }

    public class LowStockItemDto
    {
        public int InventoryId { get; set; }
        public int ProductId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string? Category { get; set; }
        public int CurrentStock { get; set; }
        public int MinStock { get; set; }
    }
}
