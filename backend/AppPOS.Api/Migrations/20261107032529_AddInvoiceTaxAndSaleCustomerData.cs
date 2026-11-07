using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceTaxAndSaleCustomerData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "customer_document",
                table: "Orders",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "customer_name",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "vehicle_plate",
                table: "Orders",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "applied_tax_percentage",
                table: "OrderDetails",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "tax_name",
                table: "OrderDetails",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_VehiclePlate",
                table: "Orders",
                column: "vehicle_plate");

            // Backfill: nombre y documento de las ventas existentes desde el cliente guardado.
            migrationBuilder.Sql(@"
UPDATE o
SET customer_name = CASE WHEN c.document_number = '222222222222' THEN 'Consumidor final' ELSE c.name END,
    customer_document = CASE WHEN c.document_number = '222222222222' THEN NULL ELSE c.document_number END
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id;");
            migrationBuilder.Sql("UPDATE Orders SET customer_name = 'Consumidor final' WHERE customer_name = '';");

            // Backfill: tarifa de las líneas históricas con impuesto, deducida de base = subtotal - impuesto.
            migrationBuilder.Sql(@"
UPDATE OrderDetails
SET applied_tax_percentage = ROUND(tax_amount * 100.0 / (subtotal - tax_amount), 2)
WHERE tax_amount > 0 AND subtotal > tax_amount;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Orders_VehiclePlate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "customer_document",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "customer_name",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "vehicle_plate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "applied_tax_percentage",
                table: "OrderDetails");

            migrationBuilder.DropColumn(
                name: "tax_name",
                table: "OrderDetails");
        }
    }
}
