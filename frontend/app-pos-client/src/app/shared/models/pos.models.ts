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

export interface CreateOrderDetailDto {
  productId: number;
  sectionId: number;
  quantity: number;
  unitPrice: number;
  employeeId?: number | null;
}

export interface CreateOrderDto {
  userId: number;
  customerId: number;
  sectionId: number;
  paymentMethod: string;
  invoiceType: 'POS' | 'ELECTRONIC';
  details: CreateOrderDetailDto[];
}

export interface OrderSummary {
  orderId: number;
  customerId: number;
  sectionId: number;
  section?: { sectionId: number; name: string } | null;
  date: string;
  totalAmount: number;
  paymentMethod?: string;
  invoiceType: 'POS' | 'ELECTRONIC' | string;
  status: string;
  customer?: Pick<Customer, 'customerId' | 'name' | 'documentNumber'> | null;
  user?: { userId: number; username: string } | null;
  cancelledBy?: { userId: number; username: string } | null;
}

export interface OrderDetail {
  orderDetailId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  employeeId?: number | null;
  employee?: { employeeId: number; name: string } | null;
  appliedCommissionPercentage?: number;
  commissionAmount?: number;
  appliedBusinessProfitPercentage?: number;
  localProfitAmount?: number;
  taxAmount: number;
  subtotal: number;
  product?: Pick<Product, 'productId' | 'sku' | 'barcode' | 'name'> | null;
}

export interface Order extends OrderSummary {
  customer?: Customer | null;
  details: OrderDetail[];
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
  details: PurchaseDetail[];
  sections: Array<{ sectionId: number; name: string }>;
}

export interface CreatePurchaseDetailDto {
  productId: number;
  quantity: number;
  purchasePrice: number;
}

export interface CreatePurchaseDto {
  userId: number;
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