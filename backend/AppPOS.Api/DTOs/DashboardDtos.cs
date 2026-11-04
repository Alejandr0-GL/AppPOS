namespace AppPOS.Api.DTOs
{
    public class DashboardSummaryDto
    {
        public decimal CostValue { get; set; }
        public decimal SaleValue { get; set; }
        public decimal PotentialProfit { get; set; }
        public int LowStockCount { get; set; }
        public int OutOfStockCount { get; set; }
        public decimal TodaySalesTotal { get; set; }
        public int TodayOrdersCount { get; set; }

        /// <summary>POS-06: dinero que realmente ingresó hoy (ventas de contado de hoy + créditos cobrados hoy).</summary>
        public decimal TodayCollectedTotal { get; set; }

        /// <summary>POS-06: parte de <see cref="TodayCollectedTotal"/> que corresponde a créditos cobrados hoy.</summary>
        public decimal TodayCreditCollectedTotal { get; set; }

        /// <summary>POS-06: saldo total por cobrar (ventas a crédito en estado PENDING, sin importar la fecha).</summary>
        public decimal PendingCreditTotal { get; set; }

        /// <summary>POS-06: número de ventas a crédito pendientes de pago.</summary>
        public int PendingCreditCount { get; set; }
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

    public class ProfitTrendPointDto
    {
        public DateTime Date { get; set; }
        public decimal Sales { get; set; }
        public decimal Cost { get; set; }
        public decimal Commission { get; set; }
        public decimal Profit { get; set; }
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
