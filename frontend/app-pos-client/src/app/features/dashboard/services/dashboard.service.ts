import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary, LowStockItem, ProfitTrendPoint, SalesTrendPoint } from '../../../shared/models/pos.models';

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

  getSalesTrend(sectionId: number, startDate?: string, endDate?: string): Observable<SalesTrendPoint[]> {
    const params = new URLSearchParams({ sectionId: sectionId.toString() });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return this.http.get<SalesTrendPoint[]>(`${this.apiUrl}/charts/sales-trend?${params.toString()}`);
  }

  getProfitTrend(sectionId: number, startDate?: string, endDate?: string): Observable<ProfitTrendPoint[]> {
    const params = new URLSearchParams({ sectionId: sectionId.toString() });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return this.http.get<ProfitTrendPoint[]>(`${this.apiUrl}/charts/profit-trend?${params.toString()}`);
  }
}
