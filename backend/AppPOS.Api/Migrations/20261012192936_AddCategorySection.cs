using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCategorySection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "section_id",
                table: "Categories",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "UX_Categories_Section_Name",
                table: "Categories",
                columns: new[] { "section_id", "name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Sections",
                table: "Categories",
                column: "section_id",
                principalTable: "Sections",
                principalColumn: "section_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Sections",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "UX_Categories_Section_Name",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "section_id",
                table: "Categories");
        }
    }
}
