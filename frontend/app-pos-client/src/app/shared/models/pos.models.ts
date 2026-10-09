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
}

export interface Customer {
  customerId: number;
  name: string;
  documentNumber: string;
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
  status: string;
  customer?: Pick<Customer, 'customerId' | 'name' | 'documentNumber'> | null;
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