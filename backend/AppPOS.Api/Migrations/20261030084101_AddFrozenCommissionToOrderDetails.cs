using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFrozenCommissionToOrderDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "applied_commission_percentage",
                table: "OrderDetails",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "commission_amount",
                table: "OrderDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            // Backfill de comisiones históricas con la información disponible:
            // - Productos: costo congelado (unit_cost).
            // - Servicios: costo de insumo actual del producto (unit_cost pudo haber quedado en 0).
            // - Sin técnico asignado no se causa comisión.
            migrationBuilder.Sql(@"
                UPDATE od
                SET
                    od.applied_commission_percentage = CASE
                        WHEN od.employee_id IS NULL THEN 0
                        ELSE p.employee_commission_percentage
                    END,
                    od.commission_amount = CASE
                        WHEN od.employee_id IS NULL THEN 0
                        WHEN od.unit_price - (
                            CASE WHEN p.is_service = 1 THEN p.purchase_price ELSE od.unit_cost END
                        ) > 0
                            THEN (od.unit_price - (
                                CASE WHEN p.is_service = 1 THEN p.purchase_price ELSE od.unit_cost END
                            )) * (p.employee_commission_percentage / 100.0)
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
                name: "applied_commission_percentage",
                table: "OrderDetails");

            migrationBuilder.DropColumn(
                name: "commission_amount",
                table: "OrderDetails");
        }
    }
}
