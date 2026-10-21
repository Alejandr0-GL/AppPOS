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