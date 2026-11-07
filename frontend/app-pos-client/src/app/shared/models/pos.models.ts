export interface Product {
  productId: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  salePrice: number;
  purchasePrice: number;
  taxId: number;
  categoryId: number;
  category?: { categoryId: number; name: string } | null;
  isService: boolean;
  employeeCommissionPercentage: number;
  businessProfitPercentage: number;
  /** POS-07: ruta relativa de la imagen (p. ej. /uploads/products/12-abc.webp); usar productImageSrc(). */
  imageUrl?: string | null;
  /** POS-07: ítem abierto ("Otros"): descripción, precio y costo se escriben en cada venta. */
  isOpenItem?: boolean;
  /** INV-01: impuesto del producto (sólo se cobra en factura electrónica). */
  tax?: { taxId: number; name: string; percentage: number } | null;
}

export interface Customer {
  customerId: number;
  name: string;
  documentNumber: string;
  documentType: 'CC' | 'NIT' | 'CE' | 'PASSPORT' | string;
  address?: string;
  city: string;
  department: string;
  phone?: string;
  email?: string;
}

/** Línea del carrito del POS. */
export interface CartItem {
  /** Identificador único de la línea (un mismo ítem "Otros" puede repetirse con distinta descripción). */
  lineId: string;
  product: Product;
  /** POS-07: sólo ítems "Otros": qué se vende (p. ej. "Bombillo H4"). */
  description?: string;
  /** POS-07: sólo ítems "Otros": costo unitario (0 si no se conoce). */
  unitCost?: number;
  quantity: number;
  sectionId: number;
  employeeId?: number | null;
  /** POS-07: precio unitario a cobrar (inicia en product.salePrice; el cajero puede cambiarlo). Null = campo vacío/inválido. */
  unitPrice: number | null;
}

export interface CreateOrderDetailDto {
  productId: number;
  sectionId: number;
  quantity: number;
  /** Informativo: el servidor lo ignora y usa el precio de catálogo (ver priceOverride). */
  unitPrice: number;
  employeeId?: number | null;
  /** POS-07: precio distinto al de catálogo, elegido por el cajero (null = precio de catálogo). */
  priceOverride?: number | null;
  /** POS-07: sólo ítems "Otros". */
  description?: string | null;
  unitCost?: number | null;
}

export interface CreateOrderDto {
  /** Cliente guardado (frecuente); null = "Consumidor Final" con el nombre escrito. */
  customerId: number | null;
  /** INV-01: "a nombre de" (texto libre). */
  customerName?: string | null;
  /** INV-01: documento CC/NIT (obligatorio en factura electrónica). */
  customerDocument?: string | null;
  /** INV-01: placa del vehículo (opcional). */
  vehiclePlate?: string | null;
  sectionId: number;
  paymentMethod: string;
  receivedAmount?: number | null;
  invoiceType: 'POS' | 'ELECTRONIC';
  details: CreateOrderDetailDto[];
  /** POS-07: motivo opcional del ajuste de precio (uno por venta). */
  priceChangeReason?: string | null;
}

export interface OrderSummary {
  orderId: number;
  customerId: number;
  sectionId: number;
  section?: { sectionId: number; name: string } | null;
  date: string;
  totalAmount: number;
  paymentMethod?: string;
  receivedAmount?: number | null;
  changeAmount?: number | null;
  /** POS-06: fecha de cobro de una venta a crédito (solo PAID). */
  paidAt?: string | null;
  /** POS-07: motivo del ajuste de precio de la venta (si alguna línea se cobró distinto al de lista). */
  priceChangeReason?: string | null;
  invoiceType: 'POS' | 'ELECTRONIC' | string;
  status: string;
  /** INV-01: placa del vehículo (normalizada). */
  vehiclePlate?: string | null;
  /** INV-01: "a nombre de" congelado en la venta (puede no estar en Clientes). */
  customerName?: string | null;
  /** INV-01: documento de la factura congelado en la venta. */
  customerDocument?: string | null;
  customer?: Pick<Customer, 'customerId' | 'name' | 'documentNumber'> | null;
  user?: { userId: number; username: string } | null;
  cancelledBy?: { userId: number; username: string } | null;
}

export interface OrderDetail {
  orderDetailId: number;
  productId: number;
  quantity: number;
  /** Precio realmente cobrado por unidad. */
  unitPrice: number;
  /** POS-07: precio de catálogo congelado al vender; si ≠ unitPrice, el precio se cambió en el POS. */
  listPrice?: number;
  /** POS-07: descripción de ítems "Otros" (usar en lugar del nombre del producto). */
  description?: string | null;
  unitCost: number;
  employeeId?: number | null;
  employee?: { employeeId: number; name: string } | null;
  appliedCommissionPercentage?: number;
  commissionAmount?: number;
  appliedBusinessProfitPercentage?: number;
  localProfitAmount?: number;
  /** Impuesto total de la línea (sólo factura electrónica). */
  taxAmount: number;
  /** INV-01: tarifa congelada al vender (0 = sin impuesto). */
  appliedTaxPercentage?: number;
  /** INV-01: nombre del impuesto congelado al vender (p. ej. "IVA 19%"). */
  taxName?: string | null;
  /** Total de la línea: base + impuesto. */
  subtotal: number;
  product?: Pick<Product, 'productId' | 'sku' | 'barcode' | 'name'> | null;
}

export interface Order extends OrderSummary {
  customer?: Customer | null;
  details: OrderDetail[];
}

/** POS-06: cobro de una venta a crédito (PENDING → PAID). */
export interface PayOrderRequest {
  paymentMethod: 'CASH' | 'TRANSFER' | string;
  receivedAmount?: number | null;
}

export interface PayOrderResponse {
  message: string;
  orderId: number;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  receivedAmount?: number | null;
  changeAmount?: number | null;
}

export interface Inventory {
  inventoryId: number;
  productId: number;
  sectionId: number;
  currentStock: number;
  minStock: number;
  updatedAt: string;
  product: Pick<Product, 'productId' | 'name' | 'sku' | 'barcode' | 'salePrice'> & { category?: { categoryId: number; name: string } | null };
  section: { sectionId: number; name: string };
}

export interface StockMovement {
  movementId: number;
  quantity: number;
  movementType: string;
  reason?: string;
  createdAt: string;
  product?: Pick<Product, 'productId' | 'name' | 'sku'> | null;
  section?: { sectionId: number; name: string } | null;
  user?: { userId: number; username: string } | null;
}

export interface ProductCatalogItem extends Product {
  isActive: boolean;
  categorySectionId?: number | null;
  category?: { categoryId: number; name: string } | null;
  tax?: { taxId: number; name: string; percentage: number } | null;
  sections: Array<{ inventoryId: number; sectionId: number; name: string; currentStock: number; minStock: number }>;
}

export interface Supplier {
  supplierId: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface PurchaseDetail {
  purchaseDetailId: number;
  productId: number;
  sectionId: number;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
  product?: { productId: number; sku: string; barcode?: string; name: string } | null;
  section?: { sectionId: number; name: string } | null;
}

export interface PurchaseSummary {
  purchaseId: number;
  supplierId: number;
  userId: number;
  date: string;
  invoiceNumber?: string | null;
  observations?: string | null;
  status: string;
  totalAmount: number;
  supplier?: { supplierId: number; name: string } | null;
  user?: { userId: number; username: string } | null;
  /** SEC-01: quién anuló la compra (null en compras anteriores). */
  cancelledBy?: { userId: number; username: string } | null;
  details: PurchaseDetail[];
  sections: Array<{ sectionId: number; name: string }>;
}

export interface CreatePurchaseDetailDto {
  productId: number;
  quantity: number;
  purchasePrice: number;
}

export interface CreatePurchaseDto {
  supplierId: number;
  invoiceNumber?: string;
  sectionId: number;
  observations?: string;
  details: CreatePurchaseDetailDto[];
}

export interface DashboardSummary {
  costValue: number;
  saleValue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesTotal: number;
  todayOrdersCount: number;
  /** POS-06: contado vendido hoy + créditos cobrados hoy. */
  todayCollectedTotal: number;
  /** POS-06: parte del ingreso de hoy que viene de créditos cobrados. */
  todayCreditCollectedTotal: number;
  /** POS-06: saldo total por cobrar (ventas PENDING). */
  pendingCreditTotal: number;
  pendingCreditCount: number;
}

export interface SalesTrendPoint {
  date: string;
  total: number;
}

export interface ProfitTrendPoint {
  date: string;
  sales: number;
  cost: number;
  commission: number;
  profit: number;
}

export interface Employee {
  employeeId: number;
  name: string;
  phone?: string | null;
  role?: string | null;
  isActive: boolean;
}

export interface EmployeeCommissionItem {
  orderId: number;
  orderDetailId: number;
  date: string;
  itemName: string;
  sku: string;
  customerName: string;
  isService: boolean;
  quantity: number;
  totalSale: number;
  commissionPercentage: number;
  commissionAmount: number;
}

export interface EmployeeCommissionReport {
  employeeId: number;
  employeeName: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  totalCommission: number;
  items: EmployeeCommissionItem[];
}

export interface LowStockItem {
  inventoryId: number;
  productId: number;
  name: string;
  sku: string;
  barcode?: string | null;
  category?: string | null;
  currentStock: number;
  minStock: number;
}
