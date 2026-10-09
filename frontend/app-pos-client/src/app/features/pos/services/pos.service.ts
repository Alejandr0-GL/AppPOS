import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Product, Customer, CreateOrderDto, Order, OrderSummary } from '../../../shared/models/pos.models';

export interface Section {
  sectionId: number;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private apiUrl = 'https://localhost:7122/api';

  selectedSectionId = signal<number | null>(null);
  cartItems = signal<Array<{ product: Product; quantity: number; sectionId: number }>>([]);

  // Obtener la lista de secciones
  getSections(): Observable<Section[]> {
    return this.http.get<Section[]>(`${this.apiUrl}/Sections`);
  }

  // Obtener productos disponibles en una sección específica a través de Inventories
  getProductsBySection(sectionId: number): Observable<Product[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Inventories?sectionId=${sectionId}`).pipe(
      map(inventories => inventories.map(item => item.product))
    );
  }

  // Búsqueda dinámica de clientes por Nombre o Número de Documento
  searchCustomers(query: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.apiUrl}/Customers?search=${encodeURIComponent(query)}`);
  }

  // Cliente seleccionado para la venta activa
  selectedCustomer = signal<Customer | null>(null);

  // Buscar cliente por número de documento (POS-01)
  searchCustomerByDocument(docNumber: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/Customers/search-by-document/${docNumber}`);
  }

  // Obtenes productos disponibles
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/Products`);
  }

  // Enviar y procesar orden de venta (POS-02)
  processSale(order: CreateOrderDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/Orders`, order);
  }

  getOrders(filters: { startDate?: string; endDate?: string; customerId?: number; status?: string; sectionId?: number } = {}): Observable<OrderSummary[]> {
    const params = new URLSearchParams();

    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.customerId) params.set('customerId', filters.customerId.toString());
    if (filters.status) params.set('status', filters.status);
    if (filters.sectionId) params.set('sectionId', filters.sectionId.toString());

    const query = params.toString();
    return this.http.get<OrderSummary[]>(`${this.apiUrl}/Orders${query ? `?${query}` : ''}`);
  }

  getOrder(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/Orders/${orderId}`);
  }

  cancelOrder(orderId: number, userId: number): Observable<{ orderId: number; status: string; message: string }> {
    return this.http.put<{ orderId: number; status: string; message: string }>(
      `${this.apiUrl}/Orders/${orderId}/cancel`,
      { userId }
    );
  }
}