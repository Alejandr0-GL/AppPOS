using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "section_id",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_section_id",
                table: "Orders",
                column: "section_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Sections",
                table: "Orders",
                column: "section_id",
                principalTable: "Sections",
                principalColumn: "section_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Sections",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_section_id",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "section_id",
                table: "Orders");
        }
    }
}
