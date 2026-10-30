namespace AppPOS.Api.DTOs
{
    public class EmployeeDto
    {
        public int EmployeeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateEmployeeDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Role { get; set; }
    }

    public class UpdateEmployeeDto : CreateEmployeeDto
    {
        public int EmployeeId { get; set; }
        public bool IsActive { get; set; }
    }

    public class EmployeeCommissionItemDto
    {
        public int OrderId { get; set; }
        public int OrderDetailId { get; set; }
        public DateTime Date { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public bool IsService { get; set; }
        public int Quantity { get; set; }
        public decimal TotalSale { get; set; }
        public decimal CommissionPercentage { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal BusinessProfitPercentage { get; set; }
        public decimal LocalProfitAmount { get; set; }
    }

    public class EmployeeCommissionReportDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalCommission { get; set; }
        public decimal TotalLocalProfit { get; set; }
        public List<EmployeeCommissionItemDto> Items { get; set; } = new();
    }
}
