namespace AppPOS.Api.Services
{
    public interface IStockService
    {
        Task RegisterStockMovementAsync(int userId, int productId, int sectionId, int quantity, decimal purchasePrice, string movementType, string reason);
    }
}