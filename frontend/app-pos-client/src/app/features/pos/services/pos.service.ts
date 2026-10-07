import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, Customer, CreateOrderDto } from '../../../shared/models/pos.models';

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private apiUrl = 'https://localhost:7122/api';

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