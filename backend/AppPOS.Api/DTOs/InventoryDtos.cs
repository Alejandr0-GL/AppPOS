namespace AppPOS.Api.DTOs
{
    public class UpdateInventoryDto
    {
        public int UserId { get; set; }
        public int SectionId { get; set; }
        public int CurrentStock { get; set; }
        public int MinStock { get; set; }
        public string? Reason { get; set; }
    }
}
