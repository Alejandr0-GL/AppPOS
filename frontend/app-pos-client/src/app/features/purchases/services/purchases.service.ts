import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePurchaseDto, Product, PurchaseSummary, Supplier } from '../../../shared/models/pos.models';

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7122/api';

  getPurchases(filters: { sectionId?: number; startDate?: string; endDate?: string } = {}): Observable<PurchaseSummary[]> {
    const params = new URLSearchParams();
    if (filters.sectionId) params.set('sectionId', filters.sectionId.toString());
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    const query = params.toString();
    return this.http.get<PurchaseSummary[]>(`${this.apiUrl}/Purchases${query ? `?${query}` : ''}`);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(`${this.apiUrl}/Suppliers`);
  }

  getProducts(sectionId: number): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/Products?sectionId=${sectionId}&includeInactive=false`);
  }

  createPurchase(purchase: CreatePurchaseDto): Observable<{ purchaseId: number; message: string; totalAmount: number }> {
    return this.http.post<{ purchaseId: number; message: string; totalAmount: number }>(`${this.apiUrl}/Purchases`, purchase);
  }

  cancelPurchase(purchaseId: number, userId: number): Observable<{ purchaseId: number; status: string; message: string }> {
    return this.http.post<{ purchaseId: number; status: string; message: string }>(
      `${this.apiUrl}/Purchases/${purchaseId}/cancel`,
      { userId }
    );
  }
}
