using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUnitCostToOrderDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "unit_cost",
                table: "OrderDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            // Backfill de ventas históricas: no existe costo histórico previo, se usa el
            // precio de compra actual del producto como mejor aproximación disponible.
            migrationBuilder.Sql(@"
                UPDATE od
                SET od.unit_cost = p.purchase_price
                FROM OrderDetails AS od
                INNER JOIN Products AS p ON p.product_id = od.product_id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "unit_cost",
                table: "OrderDetails");
        }
    }
}
