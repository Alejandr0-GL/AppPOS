using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCommissionAndEmployeeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "business_profit_percentage",
                table: "Products",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 100m);

            migrationBuilder.AddColumn<decimal>(
                name: "employee_commission_percentage",
                table: "Products",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "is_service",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "employee_id",
                table: "OrderDetails",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    employee_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    commission_percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 0m),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.employee_id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_employee_id",
                table: "OrderDetails",
                column: "employee_id");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderDetails_Employees",
                table: "OrderDetails",
                column: "employee_id",
                principalTable: "Employees",
                principalColumn: "employee_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderDetails_Employees",
                table: "OrderDetails");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_OrderDetails_employee_id",
                table: "OrderDetails");

            migrationBuilder.DropColumn(
                name: "business_profit_percentage",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "employee_commission_percentage",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "is_service",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "employee_id",
                table: "OrderDetails");
        }
    }
}
