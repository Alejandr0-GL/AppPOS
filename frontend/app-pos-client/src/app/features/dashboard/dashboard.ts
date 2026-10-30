import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { catchError, forkJoin, of } from 'rxjs';
import { DashboardSummary, LowStockItem, ProfitTrendPoint, SalesTrendPoint } from '../../shared/models/pos.models';
import { PosService, Section } from '../pos/services/pos.service';
import { DashboardService } from './services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">INV-07</p>
          <h2 class="text-2xl font-black text-slate-900">Dashboard de métricas e inventario</h2>
          <p class="text-sm text-slate-500">Resumen operativo de <strong class="text-slate-700">{{ activeSectionName() }}</strong>.</p>
        </div>
        <button (click)="load()" [disabled]="loading()" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{{ loading() ? 'Actualizando...' : 'Actualizar' }}</button>
      </header>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }

      @if (loading() && !summary()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Cargando métricas de la unidad...</div>
      }

      @if (summary(); as data) {
        <div class="grid gap-3 sm:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas de hoy</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.todaySalesTotal | currency:'COP':'symbol':'1.0-0' }}</p>
            <p class="mt-1 text-xs text-slate-400">Monto vendido hoy en la unidad activa.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-violet-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Órdenes de hoy</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.todayOrdersCount }}</p>
            <p class="mt-1 text-xs text-slate-400">Ventas registradas hoy (sin anuladas).</p>
          </article>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-sky-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Valor a precio de compra</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.costValue | currency:'COP':'symbol':'1.0-0' }}</p>
            <p class="mt-1 text-xs text-slate-400">Inventario valorado al precio de compra.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Valor a precio de venta</p>
            <p class="mt-2 text-3xl font-black text-emerald-700">{{ data.saleValue | currency:'COP':'symbol':'1.0-0' }}</p>
            <p class="mt-1 text-xs text-slate-400">Inventario valorado al precio de venta.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-teal-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Margen est. ganancia</p>
            <p class="mt-2 text-3xl font-black text-teal-700">{{ data.potentialProfit | currency:'COP':'symbol':'1.0-0' }}</p>
            <p class="mt-1 text-xs text-slate-400">Diferencia entre valor de venta y costo.</p>
          </article>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-amber-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Stock bajo</p>
            <p class="mt-2 text-3xl font-black text-amber-600">{{ data.lowStockCount }}</p>
            <p class="mt-1 text-xs text-slate-400">En o por debajo del mínimo.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Agotados</p>
            <p class="mt-2 text-3xl font-black text-red-600">{{ data.outOfStockCount }}</p>
            <p class="mt-1 text-xs text-slate-400">Existencia en cero.</p>
          </article>
        </div>
      }

      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 class="text-sm font-bold text-slate-700">Rango de fechas de los gráficos</h3>
            <p class="text-xs text-slate-400">{{ trendRangeLabel() }} · {{ activeSectionName() }}</p>
          </div>
          <div class="flex flex-wrap items-end gap-2">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Desde
              <input #trendStartInput type="date" [value]="trendStartDate" (change)="onTrendStartChange(trendStartInput.value, trendStartInput)" class="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800" />
            </label>
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hasta
              <input #trendEndInput type="date" [value]="trendEndDate" (change)="onTrendEndChange(trendEndInput.value, trendEndInput)" class="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-800" />
            </label>
            <button (click)="setTrendRange(7)" class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">7 días</button>
            <button (click)="setTrendRange(30)" class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">30 días</button>
          </div>
        </div>

        @if (trendError()) {
          <div class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{{ trendError() }}</div>
        }
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-700">Tendencia de ventas</h3>
              <p class="text-xs text-slate-400">{{ trendRangeLabel() }}</p>
            </div>
            <div class="flex items-center gap-2">
              @if (trendLoading()) {
                <span class="text-xs text-slate-400">Actualizando...</span>
              }
              <span class="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">{{ salesTrendTotal() | currency:'COP':'symbol':'1.0-0' }}</span>
            </div>
          </div>
          @if (salesTrend().length > 0) {
            <div class="h-72">
              <canvas baseChart type="line" [data]="salesChartData()" [options]="salesChartOptions()"></canvas>
            </div>
          } @else {
            <div class="flex h-72 items-center justify-center text-sm text-slate-400">Sin datos de ventas recientes.</div>
          }
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-700">Ganancias a través del tiempo</h3>
              <p class="text-xs text-slate-400">Ventas, costo y ganancia del período</p>
            </div>
            <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{{ profitTrendTotal() | currency:'COP':'symbol':'1.0-0' }}</span>
          </div>
          @if (profitTrend().length > 0) {
            <div class="h-72">
              <canvas baseChart type="line" [data]="profitChartData()" [options]="profitChartOptions()"></canvas>
            </div>
          } @else {
            <div class="flex h-72 items-center justify-center text-sm text-slate-400">Sin datos de ganancias para el período.</div>
          }
        </article>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-bold text-slate-700">Alertas de reposición / stock bajo</h3>
          <span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{{ lowStock().length }} alertas</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3">SKU</th>
                <th class="px-4 py-3">Categoría</th>
                <th class="px-4 py-3">Stock actual</th>
                <th class="px-4 py-3">Stock mínimo</th>
                <th class="px-4 py-3">Faltante</th>
                <th class="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of lowStock(); track item.inventoryId) {
                <tr [class.bg-red-50]="item.currentStock === 0" [class.bg-amber-50]="item.currentStock > 0">
                  <td class="px-4 py-3 font-bold text-slate-800">{{ item.name }}</td>
                  <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ item.sku }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ item.category || 'Sin categoría' }}</td>
                  <td class="px-4 py-3 font-bold" [class.text-red-700]="item.currentStock === 0" [class.text-amber-700]="item.currentStock > 0">{{ item.currentStock }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ item.minStock }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ suggestedUnits(item) }}</td>
                  <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-red-100]="item.currentStock === 0" [class.text-red-700]="item.currentStock === 0" [class.bg-amber-100]="item.currentStock > 0" [class.text-amber-700]="item.currentStock > 0">{{ stockStatus(item) }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-12 text-center text-sm text-slate-400">No hay productos con stock bajo en esta unidad.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly posService = inject(PosService);

  summary = signal<DashboardSummary | null>(null);
  lowStock = signal<LowStockItem[]>([]);
  salesTrend = signal<SalesTrendPoint[]>([]);
  profitTrend = signal<ProfitTrendPoint[]>([]);
  sections = signal<Section[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  trendLoading = signal(false);
  trendError = signal('');
  trendStartDate = '';
  trendEndDate = '';

  selectedSectionId = this.posService.selectedSectionId;

  activeSectionName = computed(() => {
    const sectionId = this.selectedSectionId();
    return this.sections().find(section => section.sectionId === sectionId)?.name ?? 'Unidad activa';
  });

  private trendRequestId = 0;

  salesTrendTotal = computed(() => this.salesTrend().reduce((total, point) => total + point.total, 0));
  profitTrendTotal = computed(() => this.profitTrend().reduce((total, point) => total + point.profit, 0));

  salesChartData = computed<ChartData<'line'>>(() => ({
    labels: this.salesTrend().map(point => this.formatDayLabel(point.date)),
    datasets: [
      {
        label: 'Ventas',
        data: this.salesTrend().map(point => point.total),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.16)',
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        fill: true,
        tension: 0.35
      }
    ]
  }));

  salesChartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: context => ` ${this.formatCop(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          // Con 15 días o más se ocultan las etiquetas diarias para evitar saturación.
          // El tooltip conserva la fecha del día.
          display: this.salesTrend().length < 15
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => this.formatCop(Number(value))
        }
      }
    }
  }));

  profitChartData = computed<ChartData<'line'>>(() => {
    const points = this.profitTrend();

    return {
      labels: points.map(point => this.formatDayLabel(point.date)),
      datasets: [
        {
          label: 'Ventas',
          data: points.map(point => point.sales),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.10)',
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: true,
          tension: 0.35
        },
        {
          label: 'Costo',
          data: points.map(point => point.cost),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.10)',
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: false,
          tension: 0.35
        },
        {
          label: 'Ganancia',
          data: points.map(point => point.profit),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.16)',
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: true,
          tension: 0.35
        }
      ]
    };
  });

  profitChartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 10 }
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.dataset.label ?? ''}: ${this.formatCop(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          // Mismo criterio que la tendencia de ventas: sin etiquetas diarias en rangos largos.
          display: this.profitTrend().length < 15
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => this.formatCop(Number(value))
        }
      }
    }
  }));

  private readonly sectionEffect = effect(() => {
    const sectionId = this.posService.selectedSectionId();
    if (!sectionId) return;

    untracked(() => {
      // Evita mostrar métricas de la unidad anterior mientras llega la nueva data.
      this.summary.set(null);
      this.lowStock.set([]);
      this.salesTrend.set([]);
      this.profitTrend.set([]);
      this.load(sectionId);
    });
  });

  constructor() {
    this.setDefaultTrendRange();

    this.posService.getSections().subscribe({
      next: sections => this.sections.set(sections),
      error: () => this.errorMessage.set('No fue posible cargar las unidades de negocio.')
    });
  }

  load(sectionId?: number): void {
    const targetSectionId = sectionId ?? this.posService.selectedSectionId();
    if (!targetSectionId) return;

    this.loading.set(true);
    this.errorMessage.set('');

    let failures = 0;
    const fallback = <T>(value: T) => () => {
      failures += 1;
      return of(value);
    };

    // Cada métrica degrada de forma independiente: si un gráfico falla, los KPIs siguen visibles.
    forkJoin({
      summary: this.dashboardService.getSummary(targetSectionId).pipe(catchError(fallback<DashboardSummary | null>(null))),
      lowStock: this.dashboardService.getLowStock(targetSectionId).pipe(catchError(fallback<LowStockItem[]>([])))
    }).subscribe({
      next: result => {
        this.summary.set(result.summary);
        this.lowStock.set(result.lowStock);
        this.loading.set(false);

        if (failures > 0) {
          this.errorMessage.set('Algunas métricas no pudieron cargarse. Intenta actualizar nuevamente.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('No fue posible cargar las métricas del dashboard.');
      }
    });

    this.loadTrends(targetSectionId);
  }

  private loadTrends(sectionId?: number): void {
    const targetSectionId = sectionId ?? this.posService.selectedSectionId();
    if (!targetSectionId) return;

    const requestId = ++this.trendRequestId;
    this.trendLoading.set(true);
    this.trendError.set('');

    let failures = 0;
    const fallback = <T>(value: T) => () => {
      failures += 1;
      return of(value);
    };

    const startDate = this.trendStartDate || undefined;
    const endDate = this.trendEndDate || undefined;

    forkJoin({
      sales: this.dashboardService.getSalesTrend(targetSectionId, startDate, endDate).pipe(catchError(fallback<SalesTrendPoint[]>([]))),
      profit: this.dashboardService.getProfitTrend(targetSectionId, startDate, endDate).pipe(catchError(fallback<ProfitTrendPoint[]>([])))
    }).subscribe({
      next: ({ sales, profit }) => {
        if (requestId !== this.trendRequestId) return;

        this.salesTrend.set(sales);
        this.profitTrend.set(profit);
        this.trendLoading.set(false);

        if (failures > 0) {
          this.trendError.set('Algunos gráficos no pudieron cargarse. Intenta actualizar nuevamente.');
        }
      },
      error: () => {
        if (requestId !== this.trendRequestId) return;
        this.trendLoading.set(false);
        this.trendError.set('No fue posible cargar los gráficos de tendencia.');
      }
    });
  }

  onTrendStartChange(value: string, input: HTMLInputElement): void {
    if (!this.validateTrendRange(value, this.trendEndDate)) {
      // Se restaura visualmente la fecha anterior: el modelo no cambia.
      input.value = this.trendStartDate;
      return;
    }

    this.trendStartDate = value;
    this.loadTrends();
  }

  onTrendEndChange(value: string, input: HTMLInputElement): void {
    if (!this.validateTrendRange(this.trendStartDate, value)) {
      input.value = this.trendEndDate;
      return;
    }

    this.trendEndDate = value;
    this.loadTrends();
  }

  private validateTrendRange(startDate: string, endDate: string): boolean {
    this.trendError.set('');

    if (!startDate || !endDate) {
      this.trendError.set('Selecciona la fecha inicial y la final.');
      return false;
    }

    if (startDate > endDate) {
      this.trendError.set('La fecha inicial no puede ser mayor que la final.');
      return false;
    }

    return true;
  }

  setTrendRange(days: number): void {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    this.trendStartDate = this.toIsoDate(start);
    this.trendEndDate = this.toIsoDate(end);
    this.loadTrends();
  }

  trendRangeLabel(): string {
    if (!this.trendStartDate || !this.trendEndDate) return 'Selecciona un rango de fechas';
    return `${this.formatShortDate(this.trendStartDate)} al ${this.formatShortDate(this.trendEndDate)}`;
  }

  private setDefaultTrendRange(): void {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);

    this.trendStartDate = this.toIsoDate(start);
    this.trendEndDate = this.toIsoDate(end);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseIsoDate(value: string): Date {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private formatShortDate(value: string): string {
    return this.parseIsoDate(value).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  suggestedUnits(item: LowStockItem): number {
    return Math.max(item.minStock - item.currentStock, 0);
  }

  stockStatus(item: LowStockItem): 'Agotado' | 'Bajo stock' {
    return item.currentStock === 0 ? 'Agotado' : 'Bajo stock';
  }

  private formatDayLabel(value: string): string {
    const date = this.parseIsoDate(value);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  }

  private formatCop(value: number | null | undefined): string {
    return `$${Math.round(value ?? 0).toLocaleString('es-CO')}`;
  }
}
