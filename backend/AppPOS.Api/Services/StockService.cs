using AppPOS.Api.Models;
using Microsoft.EntityFrameworkCore;
using System;

namespace AppPOS.Api.Services
{
    public class StockService : IStockService
    {
        private readonly AppPosDbContext _context;

        public StockService(AppPosDbContext context)
        {
            _context = context;
        }

        public async Task RegisterStockMovementAsync(
            int userId,
            int productId,
            int sectionId,
            int quantity,
            decimal purchasePrice,
            string movementType,
            string reason)
        {
            // 1. Actualizar el precio de compra del producto (si aplica)
            if (purchasePrice > 0)
            {
                var product = await _context.Products.FindAsync(productId);
                if (product != null)
                {
                    product.PurchasePrice = purchasePrice;
                    product.UpdatedAt = DateTime.Now;
                }
            }

            // 2. Actualizar o crear registro en Inventories
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == productId && i.SectionId == sectionId);

            int stockChange = movementType.ToUpper() == "PURCHASE" ? quantity : -quantity;

            if (inventory != null)
            {
                inventory.CurrentStock += stockChange;
                inventory.UpdatedAt = DateTime.Now;
            }
            else
            {
                inventory = new Inventory
                {
                    ProductId = productId,
                    SectionId = sectionId,
                    CurrentStock = quantity,
                    MinStock = 5, // Valor base por defecto
                    UpdatedAt = DateTime.Now
                };
                _context.Inventories.Add(inventory);
            }

            // 3. Registrar la trazabilidad en StockMovements
            var movement = new StockMovement
            {
                UserId = userId,
                ProductId = productId,
                SectionId = sectionId,
                Quantity = quantity,
                MovementType = movementType,
                Reason = reason,
                CreatedAt = DateTime.Now
            };

            _context.StockMovements.Add(movement);
        }

        public async Task AdjustStockAsync(int userId, int productId, int sectionId, int newQuantity, string reason)
        {
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == productId && i.SectionId == sectionId);

            int currentStock = inventory?.CurrentStock ?? 0;
            int difference = newQuantity - currentStock;

            if (difference == 0) return; // No hay cambio que registrar

            if (inventory != null)
            {
                inventory.CurrentStock = newQuantity;
                inventory.UpdatedAt = DateTime.Now;
            }
            else
            {
                inventory = new Inventory
                {
                    ProductId = productId,
                    SectionId = sectionId,
                    CurrentStock = newQuantity,
                    MinStock = 5,
                    UpdatedAt = DateTime.Now
                };
                _context.Inventories.Add(inventory);
            }

            // Registrar el movimiento con la diferencia (positiva o negativa)
            var movement = new StockMovement
            {
                UserId = userId,
                ProductId = productId,
                SectionId = sectionId,
                Quantity = difference,
                MovementType = "ADJUSTMENT",
                Reason = reason,
                CreatedAt = DateTime.Now
            };

            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();
        }
    }
}