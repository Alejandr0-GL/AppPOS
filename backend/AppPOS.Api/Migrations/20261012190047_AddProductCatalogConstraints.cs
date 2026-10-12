using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductCatalogConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "UX_Products_Barcode",
                table: "Products",
                column: "barcode",
                unique: true,
                filter: "[barcode] IS NOT NULL AND [barcode] <> ''");

            migrationBuilder.CreateIndex(
                name: "UX_Products_Sku",
                table: "Products",
                column: "sku",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_Products_Barcode",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "UX_Products_Sku",
                table: "Products");
        }
    }
}
