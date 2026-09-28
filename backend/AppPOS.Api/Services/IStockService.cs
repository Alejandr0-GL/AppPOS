namespace AppPOS.Api.Services
{
    public interface IStockService
    {
        Task RegisterStockMovementAsync(int userId, int productId, int sectionId, int quantity, decimal purchasePrice, string movementType, string reason);

        Task AdjustStockAsync(int userId, int productId, int sectionId, int newQuantity, string reason);
    }
}