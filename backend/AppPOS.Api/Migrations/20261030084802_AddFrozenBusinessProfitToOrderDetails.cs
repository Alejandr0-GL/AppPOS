using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFrozenBusinessProfitToOrderDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "applied_business_profit_percentage",
                table: "OrderDetails",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "local_profit_amount",
                table: "OrderDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            // Backfill de la ganancia local histórica con la información disponible:
            // - Porcentaje de ganancia: valor actual del producto.
            // - Productos: costo congelado (unit_cost).
            // - Servicios: costo de insumo actual del producto (unit_cost pudo haber quedado en 0).
            // - La ganancia local no depende del técnico: siempre se calcula sobre la base precio - costo.
            migrationBuilder.Sql(@"
                UPDATE od
                SET
                    od.applied_business_profit_percentage = p.business_profit_percentage,
                    od.local_profit_amount = CASE
                        WHEN od.unit_price - (
                            CASE WHEN p.is_service = 1 THEN p.purchase_price ELSE od.unit_cost END
                        ) > 0
                            THEN (od.unit_price - (
                                CASE WHEN p.is_service = 1 THEN p.purchase_price ELSE od.unit_cost END
                            )) * (p.business_profit_percentage / 100.0)
                        ELSE 0
                    END
                FROM OrderDetails AS od
                INNER JOIN Products AS p ON p.product_id = od.product_id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "applied_business_profit_percentage",
                table: "OrderDetails");

            migrationBuilder.DropColumn(
                name: "local_profit_amount",
                table: "OrderDetails");
        }
    }
}
