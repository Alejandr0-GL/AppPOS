import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PosService } from '../pos/services/pos.service';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHOD_LABELS,
  SCOPE_LABELS,
  formatExpenseDate,
  toLocalIsoDate
} from './expense-catalog';
import {
  CreateExpenseRequest,
  Expense,
  ExpenseFilters,
  ExpensePaymentMethod,
  ExpenseScope,
  ExpenseSummary,
  ExpensesService
} from './services/expenses.service';

/** Valor del selector de categoría que habilita escribir una categoría nueva. */
const OTHER_CATEGORY = '__other__';

interface ExpenseForm {
  scope: ExpenseScope;
  category: string;
  customCategory: string;
  amount: number | null;
  paymentMethod: ExpensePaymentMethod;
  date: string;
  description: string;
}

/**
 * EXP-01 · Gastos del negocio y personales / familiares.
 * Tarjetas de resumen + filtros por período, ámbito y categoría + registro de gastos.
 * EXP-02 · Unidad de negocio en los gastos del negocio, edición y anulación (sin borrado).
 */
@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">EXP-01</p>
          <h2 class="text-2xl font-black text-slate-900">Gastos</h2>
          <p class="text-sm text-slate-500">Registra los egresos y separa los gastos del negocio de los gastos personales / familiares.</p>
        </div>
        <button type="button" (click)="openForm()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">
          + Nuevo gasto
        </button>
      </header>

      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{{ errorMessage() }}</div>
      }

      <!-- Tarjetas de resumen del período filtrado (no suman anulados) -->
      <div class="grid gap-3 sm:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 border-l-4 border-l-sky-500 bg-white p-5 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Gastos del negocio</p>
          <p class="mt-2 text-3xl font-black text-sky-700">{{ summary().businessTotal | currency:'COP':'symbol':'1.0-0' }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ countLabel(summary().businessCount) }} · {{ share(summary().businessTotal) }} del total</p>
        </article>
        <article class="rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 bg-white p-5 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Gastos personales / familiares</p>
          <p class="mt-2 text-3xl font-black text-rose-700">{{ summary().personalTotal | currency:'COP':'symbol':'1.0-0' }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ countLabel(summary().personalCount) }} · {{ share(summary().personalTotal) }} del total</p>
        </article>
        <article class="rounded-2xl border border-slate-200 border-l-4 border-l-slate-700 bg-white p-5 shadow-sm">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Total egresos</p>
          <p class="mt-2 text-3xl font-black text-slate-900">{{ summary().total | currency:'COP':'symbol':'1.0-0' }}</p>
          <p class="mt-1 text-xs text-slate-400">{{ countLabel(summary().count) }} · {{ periodLabel() }}</p>
        </article>
      </div>

      <!-- Filtros -->
      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <label class="text-xs font-bold uppercase text-slate-500">Desde
          <input type="date" [(ngModel)]="startDate" (ngModelChange)="load()" [max]="endDate || today" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label class="text-xs font-bold uppercase text-slate-500">Hasta
          <input type="date" [(ngModel)]="endDate" (ngModelChange)="load()" [min]="startDate" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label class="text-xs font-bold uppercase text-slate-500">Ámbito
          <select [(ngModel)]="scopeFilter" (ngModelChange)="onScopeFilterChange()" class="select-chevron mt-1 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-normal text-slate-700 outline-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos</option>
            <option value="BUSINESS">Negocio</option>
            <option value="PERSONAL">Personal / Familiar</option>
          </select>
        </label>
        <label class="text-xs font-bold uppercase text-slate-500">Categoría
          <select [(ngModel)]="categoryFilter" (ngModelChange)="load()" class="select-chevron mt-1 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-normal text-slate-700 outline-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas</option>
            @for (category of filterCategories(); track category) {
              <option [value]="category">{{ category }}</option>
            }
          </select>
        </label>
        <div class="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="button" (click)="setThisMonth()" class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white lg:flex-none">Este mes</button>
          <button type="button" (click)="setLastMonth()" class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white lg:flex-none">Mes anterior</button>
        </div>
      </div>

      <!-- Listado -->
      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-bold text-slate-700">{{ countLabel(activeCount()) }}</h3>
          <div class="flex items-center gap-3">
            @if (loading()) { <span class="text-xs text-slate-400">Cargando…</span> }
            <label class="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
              <input type="checkbox" [(ngModel)]="includeVoided" (ngModelChange)="load()" class="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600" />
              Mostrar anulados
            </label>
          </div>
        </div>

        <!-- Escritorio / tablet: tabla -->
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[920px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Ámbito</th>
                <th class="px-4 py-3">Categoría</th>
                <th class="px-4 py-3">Descripción</th>
                <th class="px-4 py-3">Método</th>
                <th class="px-4 py-3">Registró</th>
                <th class="px-4 py-3 text-right">Monto</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (expense of expenses(); track expense.expenseId) {
                <tr [class]="expense.isVoided ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50'">
                  <td class="whitespace-nowrap px-4 py-3" [class.text-slate-600]="!expense.isVoided">
                    {{ formatDate(expense.date) }}
                    @if (expense.updatedAt) { <span class="block text-[11px] text-slate-400" [title]="'Editado el ' + formatDate(expense.updatedAt) + (expense.updatedByUsername ? ' por ' + expense.updatedByUsername : '')">editado{{ expense.updatedByUsername ? ' por ' + expense.updatedByUsername : '' }}</span> }
                  </td>
                  <td class="px-4 py-3">
                    <span class="whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold" [ngClass]="scopeBadgeClass(expense.scope)">{{ scopeLabel(expense.scope) }}</span>
                  </td>
                  <td class="px-4 py-3 font-semibold" [class.text-slate-800]="!expense.isVoided">{{ expense.category }}</td>
                  <td class="max-w-xs truncate px-4 py-3" [class.text-slate-500]="!expense.isVoided" [title]="expense.description || ''">{{ expense.description || '—' }}</td>
                  <td class="px-4 py-3" [class.text-slate-600]="!expense.isVoided">{{ paymentLabel(expense.paymentMethod) }}</td>
                  <td class="px-4 py-3" [class.text-slate-500]="!expense.isVoided">{{ expense.username || ('Usuario #' + expense.userId) }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right font-bold" [class]="expense.isVoided ? 'line-through' : 'text-slate-900'">{{ expense.amount | currency:'COP':'symbol':'1.0-0' }}</td>
                  <td class="whitespace-nowrap px-4 py-3 text-right">
                    @if (expense.isVoided) {
                      <span class="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600" [title]="voidTitle(expense)">Anulado</span>
                    } @else {
                      <div class="flex justify-end gap-1.5">
                        <button type="button" (click)="openEdit(expense)" class="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-600">Editar</button>
                        <button type="button" (click)="openVoid(expense)" class="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-red-700">Anular</button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="px-4 py-12 text-center text-slate-400">No hay gastos registrados en este período.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Celular: tarjetas -->
        <ul class="divide-y divide-slate-100 md:hidden">
          @for (expense of expenses(); track expense.expenseId) {
            <li class="px-4 py-3" [class.opacity-60]="expense.isVoided">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-semibold text-slate-800">{{ expense.category }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {{ formatDate(expense.date) }} · {{ paymentLabel(expense.paymentMethod) }}
                  </p>
                  @if (expense.description) { <p class="mt-0.5 truncate text-xs text-slate-400">{{ expense.description }}</p> }
                </div>
                <div class="shrink-0 text-right">
                  <p class="font-bold text-slate-900" [class.line-through]="expense.isVoided">{{ expense.amount | currency:'COP':'symbol':'1.0-0' }}</p>
                  <span class="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold" [ngClass]="scopeBadgeClass(expense.scope)">{{ scopeLabel(expense.scope) }}</span>
                </div>
              </div>
              <div class="mt-2 flex justify-end gap-1.5">
                @if (expense.isVoided) {
                  <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{{ voidTitle(expense) }}</span>
                } @else {
                  <button type="button" (click)="openEdit(expense)" class="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-indigo-600">Editar</button>
                  <button type="button" (click)="openVoid(expense)" class="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-red-700">Anular</button>
                }
              </div>
            </li>
          } @empty {
            <li class="px-4 py-10 text-center text-sm text-slate-400">No hay gastos registrados en este período.</li>
          }
        </ul>
      </div>
    </section>

    <!-- Modal: nuevo / editar gasto -->
    @if (formOpen()) {
      <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeForm()"></div>
      <section class="fixed inset-4 z-50 m-auto h-fit max-h-[calc(100vh-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="expense-form-title" (keydown.escape)="closeForm()">
        <div class="flex items-start justify-between border-b pb-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">EXP-01</p>
            <h3 id="expense-form-title" class="text-xl font-black text-slate-900">{{ editingId() ? 'Editar gasto' : 'Nuevo gasto' }}</h3>
          </div>
          <button type="button" (click)="closeForm()" class="text-2xl text-slate-400 hover:text-slate-700" aria-label="Cerrar">&times;</button>
        </div>

        <form class="space-y-4 pt-4" (ngSubmit)="save()">
          <!-- Ámbito: decisión clave del formulario -->
          <fieldset>
            <legend class="text-xs font-bold uppercase text-slate-600">¿De quién es el gasto? *</legend>
            <div class="mt-1 grid grid-cols-2 gap-2">
              <button type="button" (click)="setScope('BUSINESS')" [attr.aria-pressed]="form.scope === 'BUSINESS'" [class]="scopeOptionClass('BUSINESS')">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                <span>Negocio</span>
                <span class="text-[11px] font-normal opacity-80">Arriendo, insumos, nómina…</span>
              </button>
              <button type="button" (click)="setScope('PERSONAL')" [attr.aria-pressed]="form.scope === 'PERSONAL'" [class]="scopeOptionClass('PERSONAL')">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
                <span>Personal / Familiar</span>
                <span class="text-[11px] font-normal opacity-80">Mercado, hogar, retiros…</span>
              </button>
            </div>
          </fieldset>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-xs font-bold uppercase text-slate-600">Categoría *
              <select name="category" [(ngModel)]="form.category" class="select-chevron mt-1 w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm font-normal normal-case text-slate-700 outline-none hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccionar…</option>
                @for (category of formCategories(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
                <option [value]="otherCategory">Otra…</option>
              </select>
            </label>
            <label class="block text-xs font-bold uppercase text-slate-600">Monto *
              <input name="amount" [(ngModel)]="form.amount" type="number" min="1" step="any" placeholder="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
          </div>

          @if (form.category === otherCategory) {
            <label class="block text-xs font-bold uppercase text-slate-600">Nueva categoría *
              <input name="customCategory" [(ngModel)]="form.customCategory" maxlength="60" placeholder="Ej. Papelería" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
          }

          <fieldset>
            <legend class="text-xs font-bold uppercase text-slate-600">Método de pago *</legend>
            <div class="mt-1 flex gap-2">
              @for (method of paymentMethods; track method) {
                <button type="button" (click)="form.paymentMethod = method" [attr.aria-pressed]="form.paymentMethod === method" [class]="choiceClass(form.paymentMethod === method)">{{ paymentLabel(method) }}</button>
              }
            </div>
          </fieldset>

          <label class="block text-xs font-bold uppercase text-slate-600">Fecha del gasto *
            <input name="date" [(ngModel)]="form.date" type="date" [max]="today" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>

          <label class="block text-xs font-bold uppercase text-slate-600">Descripción
            <textarea name="description" [(ngModel)]="form.description" maxlength="250" rows="2" placeholder="Opcional: detalle del gasto" class="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </label>

          @if (formError()) { <p class="text-sm font-bold text-red-600" role="alert">{{ formError() }}</p> }

          <div class="flex justify-end gap-2 border-t pt-4">
            <button type="button" (click)="closeForm()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" [disabled]="saving()" class="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
              {{ saving() ? 'Guardando…' : (editingId() ? 'Guardar cambios' : 'Registrar gasto') }}
            </button>
          </div>
        </form>
      </section>
    }

    <!-- Modal: anular gasto (EXP-02) -->
    @if (voidTarget(); as target) {
      <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeVoid()"></div>
      <section class="fixed inset-4 z-50 m-auto h-fit max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="void-title" (keydown.escape)="closeVoid()">
        <h3 id="void-title" class="text-lg font-black text-slate-900">¿Anular este gasto?</h3>
        <p class="mt-2 text-sm text-slate-600">
          <span class="font-bold">{{ target.category }}</span> · {{ formatDate(target.date) }} ·
          <span class="font-bold">{{ target.amount | currency:'COP':'symbol':'1.0-0' }}</span>
        </p>
        <p class="mt-2 text-xs text-slate-500">El gasto no se borra: queda en el historial como anulado y deja de sumar en los totales. Esta acción no se puede deshacer.</p>

        <label class="mt-4 block text-xs font-bold uppercase text-slate-600">Motivo
          <textarea [(ngModel)]="voidReason" maxlength="250" rows="2" placeholder="Opcional: p. ej. registrado dos veces" class="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
        </label>

        @if (voidError()) { <p class="mt-2 text-sm font-bold text-red-600" role="alert">{{ voidError() }}</p> }

        <div class="mt-4 flex justify-end gap-2 border-t pt-4">
          <button type="button" (click)="closeVoid()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="button" (click)="confirmVoid()" [disabled]="voiding()" class="rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {{ voiding() ? 'Anulando…' : 'Anular gasto' }}
          </button>
        </div>
      </section>
    }
  `
})
export class ExpensesComponent {
  private readonly expensesService = inject(ExpensesService);
  private readonly posService = inject(PosService);

  readonly today = toLocalIsoDate(new Date());
  readonly otherCategory = OTHER_CATEGORY;
  readonly paymentMethods: ExpensePaymentMethod[] = ['CASH', 'TRANSFER', 'CARD'];

  readonly expenses = signal<Expense[]>([]);
  readonly activeCount = computed(() => this.expenses().filter(expense => !expense.isVoided).length);
  readonly summary = signal<ExpenseSummary>(this.emptySummary());
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  /**
   * EXP-02: unidad de negocio global (barra superior). Igual que en Historial de ventas e Inventario,
   * la pantalla sólo muestra los gastos de esa unidad: las unidades son independientes.
   */
  readonly selectedSectionId = this.posService.selectedSectionId;

  // Filtros (por defecto: mes actual)
  startDate = '';
  endDate = '';
  scopeFilter: ExpenseScope | '' = '';
  categoryFilter = '';
  includeVoided = false;

  /** Categorías para el filtro: sugeridas del ámbito + las ya usadas en el período. */
  private readonly usedCategories = signal<{ scope: ExpenseScope; category: string }[]>([]);
  private readonly scopeFilterSignal = signal<ExpenseScope | ''>('');
  readonly filterCategories = computed(() => {
    const scope = this.scopeFilterSignal();
    const suggested = scope ? EXPENSE_CATEGORIES[scope] : [...EXPENSE_CATEGORIES.BUSINESS, ...EXPENSE_CATEGORIES.PERSONAL];
    const used = this.usedCategories().filter(item => !scope || item.scope === scope).map(item => item.category);
    return [...new Set([...suggested, ...used])].sort((a, b) => a.localeCompare(b, 'es'));
  });

  // Formulario (crear / editar)
  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  private readonly formScope = signal<ExpenseScope>('BUSINESS');
  readonly formCategories = computed(() => EXPENSE_CATEGORIES[this.formScope()]);
  form: ExpenseForm = this.emptyForm();

  // Anulación
  readonly voidTarget = signal<Expense | null>(null);
  readonly voiding = signal(false);
  readonly voidError = signal('');
  voidReason = '';

  /** Al cambiar de unidad arriba se cierran los modales y se recarga (también hace la carga inicial). */
  private readonly sectionEffect = effect(() => {
    if (!this.selectedSectionId()) return;
    untracked(() => {
      this.formOpen.set(false);
      this.voidTarget.set(null);
      this.successMessage.set('');
      this.load();
    });
  });

  constructor() {
    const now = new Date();
    this.startDate = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate = this.today;
  }

  load(): void {
    const sectionId = this.selectedSectionId();
    if (!sectionId) return; // Se carga en cuanto el layout define la unidad.

    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.errorMessage.set('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    const filters: ExpenseFilters = {
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      scope: this.scopeFilter,
      sectionId,
      category: this.categoryFilter || undefined,
      includeVoided: this.includeVoided
    };

    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      expenses: this.expensesService.getExpenses(filters),
      summary: this.expensesService.getSummary(filters)
    }).subscribe({
      next: ({ expenses, summary }) => {
        this.expenses.set(expenses);
        this.summary.set(summary);
        this.usedCategories.set(summary.byCategory.map(item => ({ scope: item.scope, category: item.category })));
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'No fue posible cargar los gastos.');
      }
    });
  }

  onScopeFilterChange(): void {
    this.scopeFilterSignal.set(this.scopeFilter);
    // Si la categoría elegida no pertenece al nuevo ámbito, se limpia.
    if (this.categoryFilter && !this.filterCategories().includes(this.categoryFilter)) {
      this.categoryFilter = '';
    }
    this.load();
  }

  setThisMonth(): void {
    const now = new Date();
    this.startDate = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.endDate = this.today;
    this.load();
  }

  setLastMonth(): void {
    const now = new Date();
    this.startDate = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    this.endDate = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 0));
    this.load();
  }

  // ---- Formulario ----

  openForm(): void {
    this.form = this.emptyForm();
    this.openFormWith(null);
  }

  /** EXP-02: abre el formulario con los datos del gasto para corregirlo. */
  openEdit(expense: Expense): void {
    const suggested = EXPENSE_CATEGORIES[expense.scope].includes(expense.category);
    this.form = {
      scope: expense.scope,
      category: suggested ? expense.category : OTHER_CATEGORY,
      customCategory: suggested ? '' : expense.category,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      date: expense.date.slice(0, 10),
      description: expense.description ?? ''
    };
    this.openFormWith(expense.expenseId);
  }

  closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  setScope(scope: ExpenseScope): void {
    if (this.form.scope === scope) return;
    this.form.scope = scope;
    this.formScope.set(scope);
    // Las categorías cambian por ámbito: se reinicia la selección.
    this.form.category = '';
    this.form.customCategory = '';
  }

  save(): void {
    const category = this.form.category === OTHER_CATEGORY ? this.form.customCategory.trim() : this.form.category;
    const amount = Number(this.form.amount);
    // La unidad sale de la barra superior (la lista sólo muestra gastos de esa unidad).
    const sectionId = this.selectedSectionId();

    if (!sectionId) return this.formError.set('Selecciona la unidad de negocio en la barra superior.');
    if (!category) return this.formError.set('Selecciona o escribe la categoría del gasto.');
    if (!amount || amount <= 0) return this.formError.set('El monto debe ser mayor a 0.');
    if (!this.form.date) return this.formError.set('Selecciona la fecha del gasto.');
    if (this.form.date > this.today) return this.formError.set('La fecha del gasto no puede ser futura.');

    const request: CreateExpenseRequest = {
      amount,
      category,
      scope: this.form.scope,
      sectionId,
      paymentMethod: this.form.paymentMethod,
      description: this.form.description.trim() || null,
      date: this.form.date
    };

    const editingId = this.editingId();
    const request$ = editingId
      ? this.expensesService.updateExpense(editingId, request)
      : this.expensesService.createExpense(request);

    this.formError.set('');
    this.saving.set(true);
    request$.subscribe({
      next: result => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.successMessage.set(result.message);
        this.load();
      },
      error: error => {
        this.saving.set(false);
        this.formError.set(error?.error?.message || (editingId ? 'No fue posible guardar los cambios.' : 'No fue posible registrar el gasto.'));
      }
    });
  }

  // ---- Anulación (EXP-02) ----

  openVoid(expense: Expense): void {
    this.voidReason = '';
    this.voidError.set('');
    this.successMessage.set('');
    this.voidTarget.set(expense);
  }

  closeVoid(): void {
    if (this.voiding()) return;
    this.voidTarget.set(null);
  }

  confirmVoid(): void {
    const target = this.voidTarget();
    if (!target) return;

    this.voiding.set(true);
    this.voidError.set('');
    this.expensesService.voidExpense(target.expenseId, this.voidReason.trim() || null).subscribe({
      next: result => {
        this.voiding.set(false);
        this.voidTarget.set(null);
        this.successMessage.set(result.message);
        this.load();
      },
      error: error => {
        this.voiding.set(false);
        this.voidError.set(error?.error?.message || 'No fue posible anular el gasto.');
      }
    });
  }

  // ---- Presentación ----

  scopeLabel(scope: ExpenseScope): string {
    return SCOPE_LABELS[scope] ?? scope;
  }

  paymentLabel(method: ExpensePaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method] ?? method;
  }

  formatDate(value: string): string {
    return formatExpenseDate(value);
  }

  voidTitle(expense: Expense): string {
    const when = expense.voidedAt ? ` el ${formatExpenseDate(expense.voidedAt)}` : '';
    const who = expense.voidedByUsername ? ` por ${expense.voidedByUsername}` : '';
    return `Anulado${when}${who}${expense.voidReason ? ` · ${expense.voidReason}` : ''}`;
  }

  scopeBadgeClass(scope: ExpenseScope): string {
    return scope === 'BUSINESS' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700';
  }

  countLabel(count: number): string {
    return `${count} ${count === 1 ? 'gasto' : 'gastos'}`;
  }

  share(value: number): string {
    const total = this.summary().total;
    return total > 0 ? `${Math.round((value / total) * 100)} %` : '0 %';
  }

  periodLabel(): string {
    if (this.startDate && this.endDate) return `${formatExpenseDate(this.startDate)} – ${formatExpenseDate(this.endDate)}`;
    return 'todo el historial';
  }

  /** Botón grande de ámbito (Negocio / Personal), activo con el color de su badge. */
  scopeOptionClass(scope: ExpenseScope): string {
    const base = 'flex flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors';
    if (this.form.scope !== scope) {
      return `${base} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`;
    }
    return scope === 'BUSINESS'
      ? `${base} border-sky-500 bg-sky-50 text-sky-700`
      : `${base} border-rose-500 bg-rose-50 text-rose-700`;
  }

  /** Botón de selección (mismo estilo que el POS: activo en azul). */
  choiceClass(active: boolean): string {
    const base = 'flex-1 rounded-lg border py-2 text-sm font-bold transition-colors';
    return active
      ? `${base} border-indigo-600 bg-indigo-600 text-white shadow-sm`
      : `${base} border-slate-300 bg-white text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white`;
  }

  private openFormWith(expenseId: number | null): void {
    this.editingId.set(expenseId);
    this.formScope.set(this.form.scope);
    this.formError.set('');
    this.successMessage.set('');
    this.formOpen.set(true);
  }

  private emptyForm(): ExpenseForm {
    return {
      scope: 'BUSINESS',
      category: '',
      customCategory: '',
      amount: null,
      paymentMethod: 'CASH',
      date: this.today,
      description: ''
    };
  }

  private emptySummary(): ExpenseSummary {
    return { businessTotal: 0, businessCount: 0, personalTotal: 0, personalCount: 0, total: 0, count: 0, byCategory: [] };
  }
}
