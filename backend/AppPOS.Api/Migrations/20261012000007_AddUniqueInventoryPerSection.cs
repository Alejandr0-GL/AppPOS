using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueInventoryPerSection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_Inventories_product_id'
                      AND object_id = OBJECT_ID('Inventories')
                )
                BEGIN
                    DROP INDEX [IX_Inventories_product_id] ON [Inventories];
                END");

            migrationBuilder.CreateIndex(
                name: "UX_Inventories_Product_Section",
                table: "Inventories",
                columns: new[] { "product_id", "section_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'UX_Inventories_Product_Section'
                      AND object_id = OBJECT_ID('Inventories')
                )
                BEGIN
                    DROP INDEX [UX_Inventories_Product_Section] ON [Inventories];
                END");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_Inventories_product_id'
                      AND object_id = OBJECT_ID('Inventories')
                )
                BEGIN
                    CREATE INDEX [IX_Inventories_product_id] ON [Inventories] ([product_id]);
                END");
        }
    }
}
