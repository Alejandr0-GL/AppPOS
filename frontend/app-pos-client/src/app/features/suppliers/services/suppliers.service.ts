import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Supplier } from '../../../shared/models/pos.models';

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7122/api/Suppliers';

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>(this.apiUrl);
  }

  createSupplier(supplier: Omit<Supplier, 'supplierId'>): Observable<Supplier> {
    return this.http.post<Supplier>(this.apiUrl, supplier);
  }

  updateSupplier(supplier: Supplier): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${supplier.supplierId}`, supplier);
  }
}
