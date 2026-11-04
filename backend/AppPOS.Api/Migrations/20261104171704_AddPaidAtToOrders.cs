using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPaidAtToOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "paid_at",
                table: "Orders",
                type: "datetime2",
                nullable: true);

            // Backfill: los créditos cobrados antes de esta migración no tienen fecha de cobro;
            // se aproxima con la fecha de la venta para que el dashboard los considere.
            migrationBuilder.Sql("UPDATE [Orders] SET [paid_at] = [date] WHERE [status] = 'PAID' AND [paid_at] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "Orders");
        }
    }
}
