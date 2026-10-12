using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "invoice_type",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "POS");

            migrationBuilder.AddColumn<int>(
                name: "user_id",
                table: "Orders",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_user_id",
                table: "Orders",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Users",
                table: "Orders",
                column: "user_id",
                principalTable: "Users",
                principalColumn: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Users",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_user_id",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "invoice_type",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "user_id",
                table: "Orders");
        }
    }
}
