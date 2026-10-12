namespace AppPOS.Api.DTOs
{
    public class CustomerDto
    {
        public int CustomerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "CC";
        public string? Address { get; set; }
        public string City { get; set; } = "Medellín";
        public string Department { get; set; } = "Antioquia";
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class CreateCustomerDto
    {
        public string Name { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "CC";
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Department { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class UpdateCustomerDto : CreateCustomerDto
    {
        public int CustomerId { get; set; }
    }
}
