using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderCancellationUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "cancelled_by_user_id",
                table: "Orders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_cancelled_by_user_id",
                table: "Orders",
                column: "cancelled_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_CancelledByUser",
                table: "Orders",
                column: "cancelled_by_user_id",
                principalTable: "Users",
                principalColumn: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Orders_CancelledByUser",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_Orders_cancelled_by_user_id",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "cancelled_by_user_id",
                table: "Orders");
        }
    }
}
