import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryDistributionItem, DashboardSummary, LowStockItem, SalesTrendPoint } from '../../../shared/models/pos.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7122/api/Dashboard';

  getSummary(sectionId: number): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary?sectionId=${sectionId}`);
  }

  getLowStock(sectionId: number): Observable<LowStockItem[]> {
    return this.http.get<LowStockItem[]>(`${this.apiUrl}/low-stock?sectionId=${sectionId}`);
  }

  getSalesTrend(sectionId: number): Observable<SalesTrendPoint[]> {
    return this.http.get<SalesTrendPoint[]>(`${this.apiUrl}/charts/sales-trend?sectionId=${sectionId}`);
  }

  getCategoryDistribution(sectionId: number): Observable<CategoryDistributionItem[]> {
    return this.http.get<CategoryDistributionItem[]>(`${this.apiUrl}/charts/category-distribution?sectionId=${sectionId}`);
  }
}
