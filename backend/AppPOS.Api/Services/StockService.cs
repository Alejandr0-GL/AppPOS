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
            if (newQuantity < 0)
            {
                throw new InvalidOperationException("El stock no puede ser negativo.");
            }

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

        public async Task UpdateInventoryAsync(int userId, int inventoryId, int sectionId, int currentStock, int minStock, string reason)
        {
            if (currentStock < 0 || minStock < 0)
            {
                throw new InvalidOperationException("El stock actual y el stock mínimo no pueden ser negativos.");
            }

            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new InvalidOperationException("El motivo del ajuste es obligatorio.");
            }

            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.InventoryId == inventoryId && i.SectionId == sectionId);

            if (inventory == null)
            {
                throw new KeyNotFoundException("El inventario no existe en la unidad de negocio seleccionada.");
            }

            var difference = currentStock - inventory.CurrentStock;
            inventory.CurrentStock = currentStock;
            inventory.MinStock = minStock;
            inventory.UpdatedAt = DateTime.Now;

            if (difference != 0)
            {
                _context.StockMovements.Add(new StockMovement
                {
                    UserId = userId,
                    ProductId = inventory.ProductId,
                    SectionId = inventory.SectionId,
                    Quantity = difference,
                    MovementType = "ADJUSTMENT",
                    Reason = reason,
                    CreatedAt = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task DeductStockForSaleAsync(int userId, int productId, int sectionId, int quantity, string reason)
        {
            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == productId && i.SectionId == sectionId);

            if (inventory == null || inventory.CurrentStock < quantity)
            {
                throw new InvalidOperationException($"Stock insuficiente para el producto ID {productId} en la sección {sectionId}. Stock disponible: {inventory?.CurrentStock ?? 0}");
            }

            // Descontar inventario
            inventory.CurrentStock -= quantity;
            inventory.UpdatedAt = DateTime.Now;

            // Registrar trazabilidad de salida
            var movement = new StockMovement
            {
                UserId = userId,
                ProductId = productId,
                SectionId = sectionId,
                Quantity = -quantity, // Valor negativo representa salida
                MovementType = "SALE",
                Reason = reason,
                CreatedAt = DateTime.Now
            };

            _context.StockMovements.Add(movement);
        }

        public async Task RestoreStockForSaleAsync(int userId, int productId, int sectionId, int quantity, string reason)
        {
            if (quantity <= 0)
            {
                throw new InvalidOperationException("La cantidad a reponer debe ser mayor que cero.");
            }

            var inventory = await _context.Inventories
                .FirstOrDefaultAsync(i => i.ProductId == productId && i.SectionId == sectionId);

            if (inventory == null)
            {
                inventory = new Inventory
                {
                    ProductId = productId,
                    SectionId = sectionId,
                    CurrentStock = quantity,
                    MinStock = 5,
                    UpdatedAt = DateTime.Now
                };
                _context.Inventories.Add(inventory);
            }
            else
            {
                inventory.CurrentStock += quantity;
                inventory.UpdatedAt = DateTime.Now;
            }

            _context.StockMovements.Add(new StockMovement
            {
                UserId = userId,
                ProductId = productId,
                SectionId = sectionId,
                Quantity = quantity,
                MovementType = "SALE_CANCELLED",
                Reason = reason,
                CreatedAt = DateTime.Now
            });
        }
    }
}