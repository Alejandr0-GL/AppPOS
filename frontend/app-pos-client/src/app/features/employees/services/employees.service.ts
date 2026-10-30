import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Employee, EmployeeCommissionReport } from '../../../shared/models/pos.models';

@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://localhost:7122/api/Employees';

  getEmployees(includeInactive = false): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.apiUrl}?includeInactive=${includeInactive}`);
  }

  createEmployee(employee: Omit<Employee, 'employeeId' | 'isActive'>): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  updateEmployee(employee: Employee): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${employee.employeeId}`, employee);
  }

  deleteEmployee(employeeId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${employeeId}`);
  }

  getCommissions(employeeId: number, startDate?: string, endDate?: string): Observable<EmployeeCommissionReport> {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();

    return this.http.get<EmployeeCommissionReport>(`${this.apiUrl}/${employeeId}/commissions${query ? `?${query}` : ''}`);
  }
}
