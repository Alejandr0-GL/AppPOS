using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AppPOS.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    category_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Categori__D54EE9B42B583CB0", x => x.category_id);
                });

            migrationBuilder.CreateTable(
                name: "Customers",
                columns: table => new
                {
                    customer_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    document_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Customer__CD65CB8592ACF920", x => x.customer_id);
                });

            migrationBuilder.CreateTable(
                name: "Sections",
                columns: table => new
                {
                    section_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Sections__F842676AE8267A56", x => x.section_id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    supplier_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Supplier__6EE594E81C955A21", x => x.supplier_id);
                });

            migrationBuilder.CreateTable(
                name: "Taxes",
                columns: table => new
                {
                    tax_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Taxes__129B867049C55066", x => x.tax_id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    username = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())"),
                    last_access = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Users__B9BE370F4DEAD774", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    order_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    customer_id = table.Column<int>(type: "int", nullable: false),
                    date = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())"),
                    total_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    payment_method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Orders__4659622967A8440B", x => x.order_id);
                    table.ForeignKey(
                        name: "FK_Orders_Customers",
                        column: x => x.customer_id,
                        principalTable: "Customers",
                        principalColumn: "customer_id");
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    product_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    category_id = table.Column<int>(type: "int", nullable: false),
                    tax_id = table.Column<int>(type: "int", nullable: false),
                    sku = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    barcode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    purchase_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    sale_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    is_active = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    image_url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Products__47027DF5F0BBB5BC", x => x.product_id);
                    table.ForeignKey(
                        name: "FK_Products_Categories",
                        column: x => x.category_id,
                        principalTable: "Categories",
                        principalColumn: "category_id");
                    table.ForeignKey(
                        name: "FK_Products_Taxes",
                        column: x => x.tax_id,
                        principalTable: "Taxes",
                        principalColumn: "tax_id");
                });

            migrationBuilder.CreateTable(
                name: "Purchases",
                columns: table => new
                {
                    purchase_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    supplier_id = table.Column<int>(type: "int", nullable: false),
                    date = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())"),
                    invoice_number = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    total_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    observations = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Purchase__87071CB960C4415F", x => x.purchase_id);
                    table.ForeignKey(
                        name: "FK_Purchases_Suppliers",
                        column: x => x.supplier_id,
                        principalTable: "Suppliers",
                        principalColumn: "supplier_id");
                    table.ForeignKey(
                        name: "FK_Purchases_Users",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "OrderDetails",
                columns: table => new
                {
                    order_detail_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    order_id = table.Column<int>(type: "int", nullable: false),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    unit_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    tax_amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    subtotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__OrderDet__3C5A40804A35F689", x => x.order_detail_id);
                    table.ForeignKey(
                        name: "FK_OrderDetails_Orders",
                        column: x => x.order_id,
                        principalTable: "Orders",
                        principalColumn: "order_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Inventories",
                columns: table => new
                {
                    inventory_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    section_id = table.Column<int>(type: "int", nullable: false),
                    current_stock = table.Column<int>(type: "int", nullable: false),
                    min_stock = table.Column<int>(type: "int", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Inventor__B59ACC49F399EAE7", x => x.inventory_id);
                    table.ForeignKey(
                        name: "FK_Inventories_Products",
                        column: x => x.product_id,
                        principalTable: "Products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "FK_Inventories_Sections",
                        column: x => x.section_id,
                        principalTable: "Sections",
                        principalColumn: "section_id");
                });

            migrationBuilder.CreateTable(
                name: "StockMovements",
                columns: table => new
                {
                    movement_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    section_id = table.Column<int>(type: "int", nullable: false),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    movement_type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    reason = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(sysdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__StockMov__AB1D102257DF23B1", x => x.movement_id);
                    table.ForeignKey(
                        name: "FK_StockMovements_Products",
                        column: x => x.product_id,
                        principalTable: "Products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "FK_StockMovements_Sections",
                        column: x => x.section_id,
                        principalTable: "Sections",
                        principalColumn: "section_id");
                    table.ForeignKey(
                        name: "FK_StockMovements_Users",
                        column: x => x.user_id,
                        principalTable: "Users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "PurchaseDetails",
                columns: table => new
                {
                    purchase_detail_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    product_id = table.Column<int>(type: "int", nullable: false),
                    purchase_id = table.Column<int>(type: "int", nullable: false),
                    section_id = table.Column<int>(type: "int", nullable: false),
                    quantity = table.Column<int>(type: "int", nullable: false),
                    purchase_price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    subtotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Purchase__CED702D8DA5796D1", x => x.purchase_detail_id);
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_Products",
                        column: x => x.product_id,
                        principalTable: "Products",
                        principalColumn: "product_id");
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_Purchases",
                        column: x => x.purchase_id,
                        principalTable: "Purchases",
                        principalColumn: "purchase_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseDetails_Sections",
                        column: x => x.section_id,
                        principalTable: "Sections",
                        principalColumn: "section_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_product_id",
                table: "Inventories",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_Inventories_section_id",
                table: "Inventories",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_order_id",
                table: "OrderDetails",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_customer_id",
                table: "Orders",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_Products_category_id",
                table: "Products",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_Products_tax_id",
                table: "Products",
                column: "tax_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_product_id",
                table: "PurchaseDetails",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_purchase_id",
                table: "PurchaseDetails",
                column: "purchase_id");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseDetails_section_id",
                table: "PurchaseDetails",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_supplier_id",
                table: "Purchases",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_user_id",
                table: "Purchases",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_product_id",
                table: "StockMovements",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_section_id",
                table: "StockMovements",
                column: "section_id");

            migrationBuilder.CreateIndex(
                name: "IX_StockMovements_user_id",
                table: "StockMovements",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Inventories");

            migrationBuilder.DropTable(
                name: "OrderDetails");

            migrationBuilder.DropTable(
                name: "PurchaseDetails");

            migrationBuilder.DropTable(
                name: "StockMovements");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Purchases");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Sections");

            migrationBuilder.DropTable(
                name: "Customers");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Taxes");
        }
    }
}
