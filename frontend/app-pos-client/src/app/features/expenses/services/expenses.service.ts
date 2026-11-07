import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../shared/config/api.config';

// EXP-01: gastos del negocio y personales / familiares.
// EXP-02: edición, anulación y unidad de negocio.

export type ExpenseScope = 'BUSINESS' | 'PERSONAL';
export type ExpensePaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

export interface Expense {
  expenseId: number;
  userId: number;
  username?: string | null;
  amount: number;
  category: string;
  scope: ExpenseScope;
  /** Unidad de negocio dueña del gasto (las unidades son independientes). */
  sectionId: number;
  sectionName?: string | null;
  paymentMethod: ExpensePaymentMethod;
  description?: string | null;
  /** Fecha del gasto (ISO, sólo la parte de fecha es relevante). */
  date: string;
  createdAt: string;
  updatedAt?: string | null;
  isVoided: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
}

/** Cuerpo de crear (POST) y editar (PUT). */
export interface CreateExpenseRequest {
  userId: number;
  amount: number;
  category: string;
  scope: ExpenseScope;
  sectionId: number;
  paymentMethod: ExpensePaymentMethod;
  description?: string | null;
  /** yyyy-MM-dd */
  date: string;
}

export interface ExpenseFilters {
  /** yyyy-MM-dd */
  startDate?: string;
  /** yyyy-MM-dd */
  endDate?: string;
  scope?: ExpenseScope | '';
  category?: string;
  sectionId?: number | null;
  /** Sólo aplica al listado: el resumen nunca suma anulados. */
  includeVoided?: boolean;
}

export interface ExpenseCategoryTotal {
  scope: ExpenseScope;
  category: string;
  total: number;
  count: number;
}

export interface ExpenseSummary {
  businessTotal: number;
  businessCount: number;
  personalTotal: number;
  personalCount: number;
  total: number;
  count: number;
  byCategory: ExpenseCategoryTotal[];
}

export interface ExpenseActionResult {
  message: string;
  expenseId: number;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/Expenses`;

  getExpenses(filters: ExpenseFilters): Observable<Expense[]> {
    const params = this.toParams(filters);
    if (filters.includeVoided) params.set('includeVoided', 'true');
    return this.http.get<Expense[]>(`${this.apiUrl}?${params}`);
  }

  getSummary(filters: ExpenseFilters): Observable<ExpenseSummary> {
    return this.http.get<ExpenseSummary>(`${this.apiUrl}/summary?${this.toParams(filters)}`);
  }

  createExpense(expense: CreateExpenseRequest): Observable<ExpenseActionResult> {
    return this.http.post<ExpenseActionResult>(this.apiUrl, expense);
  }

  updateExpense(expenseId: number, expense: CreateExpenseRequest): Observable<ExpenseActionResult> {
    return this.http.put<ExpenseActionResult>(`${this.apiUrl}/${expenseId}`, expense);
  }

  voidExpense(expenseId: number, reason: string | null): Observable<ExpenseActionResult> {
    return this.http.put<ExpenseActionResult>(`${this.apiUrl}/${expenseId}/void`, { reason });
  }

  private toParams(filters: ExpenseFilters): URLSearchParams {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.scope) params.set('scope', filters.scope);
    if (filters.category) params.set('category', filters.category);
    if (filters.sectionId) params.set('sectionId', String(filters.sectionId));
    return params;
  }
}
