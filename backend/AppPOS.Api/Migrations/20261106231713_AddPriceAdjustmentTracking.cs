using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPriceAdjustmentTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "price_change_reason",
                table: "Orders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "list_price",
                table: "OrderDetails",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            // Backfill: hasta POS-07 siempre se cobró el precio de catálogo, así que el precio
            // de lista histórico es el mismo precio cobrado (no aparecen como "precio ajustado").
            migrationBuilder.Sql("UPDATE [OrderDetails] SET [list_price] = [unit_price];");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "price_change_reason",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "list_price",
                table: "OrderDetails");
        }
    }
}
