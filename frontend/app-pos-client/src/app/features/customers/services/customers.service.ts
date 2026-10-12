import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer } from '../../../shared/models/pos.models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7122/api/Customers';

  getCustomers(search = ''): Observable<Customer[]> {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    return this.http.get<Customer[]>(`${this.apiUrl}${query}`);
  }

  createCustomer(customer: Omit<Customer, 'customerId'>): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer);
  }

  updateCustomer(customer: Customer): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${customer.customerId}`, customer);
  }
}
