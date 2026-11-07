using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserAuthentication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SEC-01: roles en mayúsculas (ADMIN / CASHIER) antes de usarlos en el JWT.
            migrationBuilder.Sql("UPDATE Users SET role = UPPER(LTRIM(RTRIM(role)));");

            migrationBuilder.AddColumn<int>(
                name: "failed_login_attempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "full_name",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "lockout_until",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "section_id",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "token_version",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "cancelled_by_user_id",
                table: "Purchases",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "updated_by_user_id",
                table: "Expenses",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "voided_by_user_id",
                table: "Expenses",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_section_id",
                table: "Users",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "UX_Users_Username",
                table: "Users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_cancelled_by_user_id",
                table: "Purchases",
                column: "cancelled_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_updated_by_user_id",
                table: "Expenses",
                column: "updated_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_voided_by_user_id",
                table: "Expenses",
                column: "voided_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_UpdatedByUser",
                table: "Expenses",
                column: "updated_by_user_id",
                principalTable: "Users",
                principalColumn: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_VoidedByUser",
                table: "Expenses",
                column: "voided_by_user_id",
                principalTable: "Users",
                principalColumn: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Purchases_CancelledByUser",
                table: "Purchases",
                column: "cancelled_by_user_id",
                principalTable: "Users",
                principalColumn: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Sections",
                table: "Users",
                column: "section_id",
                principalTable: "Sections",
                principalColumn: "section_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_UpdatedByUser",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_VoidedByUser",
                table: "Expenses");

            migrationBuilder.DropForeignKey(
                name: "FK_Purchases_CancelledByUser",
                table: "Purchases");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Sections",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_section_id",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "UX_Users_Username",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Purchases_cancelled_by_user_id",
                table: "Purchases");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_updated_by_user_id",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_voided_by_user_id",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "failed_login_attempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "full_name",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "lockout_until",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "section_id",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "token_version",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "cancelled_by_user_id",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "updated_by_user_id",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "voided_by_user_id",
                table: "Expenses");
        }
    }
}
