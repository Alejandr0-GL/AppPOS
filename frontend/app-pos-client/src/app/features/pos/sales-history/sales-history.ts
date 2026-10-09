import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, OrderSummary } from '../../../shared/models/pos.models';
import { PosService } from '../services/pos.service';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="p-4 md:p-6 space-y-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">POS-03</p>
          <h2 class="text-2xl font-black text-slate-900">Historial de ventas</h2>
          <p class="text-sm text-slate-500">Consulta comprobantes y revisa cada producto vendido.</p>
        </div>
        <button (click)="loadOrders()" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">
          Actualizar
        </button>
      </header>

      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
          Desde
          <input [(ngModel)]="startDate" (ngModelChange)="loadOrders()" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
          Hasta
          <input [(ngModel)]="endDate" (ngModelChange)="loadOrders()" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
          Cliente / ID
          <input [(ngModel)]="customerId" (ngModelChange)="loadOrders()" type="number" min="1" placeholder="Todos" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
          Estado
          <select [(ngModel)]="status" (ngModelChange)="loadOrders()" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="">Todos</option>
          </select>
        </label>
        <button (click)="clearFilters()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 md:col-span-4">
          Limpiar filtros
        </button>
      </div>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{{ orders().length }} ventas encontradas</div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[650px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-4 py-3">Orden</th>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (order of orders(); track order.orderId) {
                  <tr (click)="selectOrder(order.orderId)" [class.bg-indigo-50]="selectedOrder()?.orderId === order.orderId" class="cursor-pointer hover:bg-slate-50">
                    <td class="px-4 py-3 font-bold text-slate-800">#{{ order.orderId }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ order.date | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-4 py-3"><span class="block font-semibold text-slate-700">{{ order.customer?.name || 'Consumidor final' }}</span><span class="text-xs text-slate-400">{{ order.customer?.documentNumber || 'Sin documento' }}</span></td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="order.status === 'COMPLETED'" [class.text-emerald-700]="order.status === 'COMPLETED'" [class.bg-amber-100]="order.status !== 'COMPLETED'" [class.text-amber-700]="order.status !== 'COMPLETED'">{{ order.status }}</span></td>
                    <td class="px-4 py-3 text-right font-black text-slate-800">{{ order.totalAmount | currency:'USD' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="px-4 py-12 text-center text-sm text-slate-400">No hay ventas para los filtros seleccionados.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          @if (selectedOrder(); as order) {
            <div class="flex items-start justify-between border-b border-slate-200 pb-4">
              <div><p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Detalle</p><h3 class="text-xl font-black text-slate-900">Orden #{{ order.orderId }}</h3></div>
              <span class="text-sm font-bold text-slate-500">{{ order.date | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
            <div class="space-y-1 border-b border-slate-200 py-4 text-sm"><p class="font-bold text-slate-800">{{ order.customer?.name || 'Consumidor final' }}</p><p class="text-slate-500">{{ order.customer?.documentNumber || 'Sin documento' }}</p><p class="text-slate-500">Pago: {{ order.paymentMethod || 'No informado' }}</p></div>
            <div class="divide-y divide-slate-100">
              @for (detail of order.details; track detail.orderDetailId) {
                <div class="flex justify-between gap-3 py-3 text-sm"><div><p class="font-bold text-slate-800">{{ detail.product?.name || 'Producto #' + detail.productId }}</p><p class="text-xs text-slate-500">{{ detail.product?.sku || 'Sin SKU' }} · {{ detail.quantity }} x {{ detail.unitPrice | currency:'USD' }}</p></div><strong class="text-slate-800">{{ detail.subtotal | currency:'USD' }}</strong></div>
              }
            </div>
            <div class="flex justify-between border-t border-slate-200 pt-4 text-lg font-black text-slate-900"><span>Total</span><span class="text-emerald-600">{{ order.totalAmount | currency:'USD' }}</span></div>
            @if (order.status === 'COMPLETED') {
              <button (click)="cancelOrder(order.orderId)" class="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                Cancelar venta
              </button>
            }
          } @else {
            <div class="flex min-h-64 items-center justify-center text-center text-sm text-slate-400">Selecciona una venta para ver sus productos.</div>
          }
        </aside>
      </div>
    </section>
  `
})
export class SalesHistoryComponent {
  private readonly posService = inject(PosService);

  orders = signal<OrderSummary[]>([]);
  selectedOrder = signal<Order | null>(null);
  selectedSectionId = this.posService.selectedSectionId;
  errorMessage = signal('');
  startDate = '';
  endDate = '';
  customerId: number | null = null;
  status = 'COMPLETED';

  private readonly sectionEffect = effect(() => {
    if (!this.selectedSectionId()) return;

    this.selectedOrder.set(null);
    this.loadOrders();
  });

  loadOrders(): void {
    this.errorMessage.set('');
    this.posService.getOrders({
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      customerId: this.customerId || undefined,
      status: this.status || undefined,
      sectionId: this.selectedSectionId() || undefined
    }).subscribe({
      next: orders => {
        this.orders.set(orders);
        const selectedId = this.selectedOrder()?.orderId;
        if (selectedId && orders.some(order => order.orderId === selectedId)) {
          this.selectOrder(selectedId);
        } else {
          this.selectedOrder.set(null);
        }
      },
      error: () => this.errorMessage.set('No fue posible cargar el historial de ventas.')
    });
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.customerId = null;
    this.status = 'COMPLETED';
    this.loadOrders();
  }

  selectOrder(orderId: number): void {
    this.posService.getOrder(orderId).subscribe({
      next: order => this.selectedOrder.set(order),
      error: () => this.errorMessage.set('No fue posible cargar el detalle de la orden.')
    });
  }

  cancelOrder(orderId: number): void {
    if (!confirm(`¿Deseas cancelar la orden #${orderId}? El stock será restaurado.`)) return;

    this.posService.cancelOrder(orderId, 1).subscribe({
      next: () => {
        this.selectedOrder.set(null);
        this.loadOrders();
      },
      error: error => this.errorMessage.set(error.error?.message || 'No fue posible cancelar la orden.')
    });
  }
}
