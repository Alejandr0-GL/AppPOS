import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Product, Customer, CreateOrderDto } from '../../../shared/models/pos.models';

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

  // Signals para gestionar el estado de la venta activa en memoria
  cartItems = signal<Array<{ product: Product; quantity: number; sectionId: number }>>([]);
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
}