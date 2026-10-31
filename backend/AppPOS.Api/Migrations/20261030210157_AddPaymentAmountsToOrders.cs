using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentAmountsToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "change_amount",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "received_amount",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "change_amount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "received_amount",
                table: "Orders");
        }
    }
}
