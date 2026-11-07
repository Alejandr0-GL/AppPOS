using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseEditVoidAndSection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_voided",
                table: "Expenses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "section_id",
                table: "Expenses",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "Expenses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "void_reason",
                table: "Expenses",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "voided_at",
                table: "Expenses",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_Section_Date",
                table: "Expenses",
                columns: new[] { "section_id", "date" });

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Sections",
                table: "Expenses",
                column: "section_id",
                principalTable: "Sections",
                principalColumn: "section_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Expenses_Sections",
                table: "Expenses");

            migrationBuilder.DropIndex(
                name: "IX_Expenses_Section_Date",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "is_voided",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "section_id",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "void_reason",
                table: "Expenses");

            migrationBuilder.DropColumn(
                name: "voided_at",
                table: "Expenses");
        }
    }
}
