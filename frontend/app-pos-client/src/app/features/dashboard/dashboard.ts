import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { catchError, forkJoin, of } from 'rxjs';
import { CategoryDistributionItem, DashboardSummary, LowStockItem, SalesTrendPoint } from '../../shared/models/pos.models';
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
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Valor a costo</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.costValue | currency:'COP':'symbol':'1.0-0' }}</p>
            <p class="mt-1 text-xs text-slate-400">Inventario valorado al precio de compra.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Valor a venta</p>
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
          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-400 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Productos activos</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.activeProducts }}</p>
            <p class="mt-1 text-xs text-slate-400">Referencias con inventario.</p>
          </article>

          <article class="rounded-2xl border border-slate-200 border-l-4 border-l-slate-400 bg-white p-5 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Unidades en stock</p>
            <p class="mt-2 text-3xl font-black text-slate-900">{{ data.totalUnits }}</p>
            <p class="mt-1 text-xs text-slate-400">Suma de existencias físicas.</p>
          </article>

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

      <div class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-700">Tendencia de ventas</h3>
              <p class="text-xs text-slate-400">Últimos 7 días · {{ activeSectionName() }}</p>
            </div>
            <span class="rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700">{{ salesTrendTotal() | currency:'COP':'symbol':'1.0-0' }}</span>
          </div>
          @if (salesTrend().length > 0) {
            <div class="h-72">
              <canvas baseChart type="line" [data]="salesChartData()" [options]="salesChartOptions"></canvas>
            </div>
          } @else {
            <div class="flex h-72 items-center justify-center text-sm text-slate-400">Sin datos de ventas recientes.</div>
          }
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-4">
            <h3 class="text-sm font-bold text-slate-700">Distribución del inventario</h3>
            <p class="text-xs text-slate-400">Valor a costo agrupado por categoría.</p>
          </div>
          @if (categoryDistribution().length > 0) {
            <div class="h-72">
              <canvas baseChart type="doughnut" [data]="categoryChartData()" [options]="categoryChartOptions"></canvas>
            </div>
          } @else {
            <div class="flex h-72 items-center justify-center text-sm text-slate-400">Sin datos de inventario para graficar.</div>
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
  categoryDistribution = signal<CategoryDistributionItem[]>([]);
  sections = signal<Section[]>([]);
  loading = signal(false);
  errorMessage = signal('');

  selectedSectionId = this.posService.selectedSectionId;

  activeSectionName = computed(() => {
    const sectionId = this.selectedSectionId();
    return this.sections().find(section => section.sectionId === sectionId)?.name ?? 'Unidad activa';
  });

  private readonly chartPalette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b', '#ec4899'];

  salesTrendTotal = computed(() => this.salesTrend().reduce((total, point) => total + point.total, 0));

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

  salesChartOptions: ChartOptions<'line'> = {
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
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: value => this.formatCop(Number(value))
        }
      }
    }
  };

  categoryChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.categoryDistribution().map(item => item.category),
    datasets: [
      {
        data: this.categoryDistribution().map(item => item.costValue),
        backgroundColor: this.categoryDistribution().map((_, index) => this.chartPalette[index % this.chartPalette.length]),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  }));

  categoryChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 10 }
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.label}: ${this.formatCop(context.parsed)}`
        }
      }
    }
  };

  private readonly sectionEffect = effect(() => {
    const sectionId = this.posService.selectedSectionId();
    if (!sectionId) return;

    untracked(() => {
      // Evita mostrar métricas de la unidad anterior mientras llega la nueva data.
      this.summary.set(null);
      this.lowStock.set([]);
      this.salesTrend.set([]);
      this.categoryDistribution.set([]);
      this.load(sectionId);
    });
  });

  constructor() {
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
      lowStock: this.dashboardService.getLowStock(targetSectionId).pipe(catchError(fallback<LowStockItem[]>([]))),
      salesTrend: this.dashboardService.getSalesTrend(targetSectionId).pipe(catchError(fallback<SalesTrendPoint[]>([]))),
      categoryDistribution: this.dashboardService.getCategoryDistribution(targetSectionId).pipe(catchError(fallback<CategoryDistributionItem[]>([])))
    }).subscribe({
      next: result => {
        this.summary.set(result.summary);
        this.lowStock.set(result.lowStock);
        this.salesTrend.set(result.salesTrend);
        this.categoryDistribution.set(result.categoryDistribution);
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
  }

  suggestedUnits(item: LowStockItem): number {
    return Math.max(item.minStock - item.currentStock, 0);
  }

  stockStatus(item: LowStockItem): 'Agotado' | 'Bajo stock' {
    return item.currentStock === 0 ? 'Agotado' : 'Bajo stock';
  }

  private formatDayLabel(value: string): string {
    const date = new Date(value);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  }

  private formatCop(value: number | null | undefined): string {
    return `$${Math.round(value ?? 0).toLocaleString('es-CO')}`;
  }
}
