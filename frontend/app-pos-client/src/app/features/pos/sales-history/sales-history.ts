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

      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
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
        <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
          Tipo comprobante
          <select [(ngModel)]="invoiceType" (ngModelChange)="loadOrders()" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
            <option value="">Todos</option>
            <option value="POS">Factura de venta</option>
            <option value="ELECTRONIC">Factura electrónica</option>
          </select>
        </label>
        <button (click)="clearFilters()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 md:col-span-5">
          Limpiar filtros
        </button>
      </div>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }

      <div>
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{{ orders().length }} ventas encontradas</div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[1120px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-4 py-3">Orden</th>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Cajero / Usuario</th>
                  <th class="px-4 py-3">Tipo comprobante</th>
                  <th class="px-4 py-3">Método pago</th>
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
                    <td class="px-4 py-3"><span class="block font-semibold text-slate-700">{{ order.user?.username || 'Sin usuario' }}</span><span class="text-xs text-slate-400">ID: {{ order.user?.userId || '-' }}</span></td>
                    <td class="px-4 py-3"><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{{ order.invoiceType === 'ELECTRONIC' ? 'Factura electrónica' : 'Factura de venta' }}</span></td>
                    <td class="px-4 py-3 font-semibold text-slate-600">{{ order.paymentMethod || 'No informado' }}</td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="order.status === 'COMPLETED'" [class.text-emerald-700]="order.status === 'COMPLETED'" [class.bg-amber-100]="order.status !== 'COMPLETED'" [class.text-amber-700]="order.status !== 'COMPLETED'">{{ order.status }}</span></td>
                    <td class="px-4 py-3 text-right font-black text-slate-800">{{ order.totalAmount | currency:'COP':'symbol':'1.0-0' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="px-4 py-12 text-center text-sm text-slate-400">No hay ventas para los filtros seleccionados.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>

      @if (selectedOrder(); as order) {
        <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeOrderDetail()"></div>
        <section class="fixed inset-4 z-50 m-auto flex max-h-[calc(100vh-2rem)] w-auto max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="Detalle de orden">
          @if (selectedOrder(); as order) {
            <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div><p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Detalle de venta</p><h3 class="text-2xl font-black text-slate-900">Orden #{{ order.orderId }}</h3><p class="text-sm text-slate-500">{{ order.invoiceType === 'ELECTRONIC' ? 'Factura electrónica' : 'Factura de venta' }} · {{ order.date | date:'dd/MM/yyyy HH:mm' }}</p></div>
              <button (click)="closeOrderDetail()" class="rounded-md px-3 py-1 text-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar detalle">&times;</button>
            </div>
            <div class="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 text-sm md:grid-cols-4"><div><span class="block text-xs uppercase text-slate-500">Cliente</span><strong class="text-slate-800">{{ order.customer?.name || 'Consumidor final' }}</strong><span class="block text-slate-500">Doc: {{ order.customer?.documentNumber || 'Sin documento' }}</span></div><div><span class="block text-xs uppercase text-slate-500">Cajero</span><strong class="text-slate-800">{{ order.user?.username || 'Sin usuario' }}</strong><span class="block text-slate-500">ID: {{ order.user?.userId || '-' }}</span></div><div><span class="block text-xs uppercase text-slate-500">Método de pago</span><strong class="text-slate-800">{{ order.paymentMethod || 'No informado' }}</strong></div><div><span class="block text-xs uppercase text-slate-500">Estado</span><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="order.status === 'COMPLETED'" [class.text-emerald-700]="order.status === 'COMPLETED'" [class.bg-red-100]="order.status === 'CANCELLED'" [class.text-red-700]="order.status === 'CANCELLED'">{{ order.status }}</span></div></div>
            <div class="flex-1 overflow-y-auto p-5"><h4 class="mb-3 font-bold text-slate-800">Productos</h4><div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Producto / SKU</th><th class="px-3 py-2">Cantidad</th><th class="px-3 py-2">Precio unitario</th><th class="px-3 py-2">IVA / Tax</th><th class="px-3 py-2 text-right">Subtotal</th></tr></thead><tbody class="divide-y divide-slate-100">
              @for (detail of order.details; track detail.orderDetailId) {
                <tr><td class="px-3 py-3"><strong class="block text-slate-800">{{ detail.product?.name || 'Producto #' + detail.productId }}</strong><span class="text-xs text-slate-500">SKU: {{ detail.product?.sku || 'Sin SKU' }}</span></td><td class="px-3 py-3 text-slate-700">{{ detail.quantity }}</td><td class="px-3 py-3 text-slate-700">{{ detail.unitPrice | currency:'COP':'symbol':'1.0-0' }}</td><td class="px-3 py-3 text-slate-700">{{ detail.taxAmount | currency:'COP':'symbol':'1.0-0' }}</td><td class="px-3 py-3 text-right font-bold text-slate-800">{{ detail.subtotal | currency:'COP':'symbol':'1.0-0' }}</td></tr>
              }
              </tbody></table></div>
            </div>
            <div class="border-t border-slate-200 p-5"><div class="ml-auto max-w-sm space-y-2 text-sm"><div class="flex justify-between text-slate-500"><span>Subtotal base</span><span>{{ baseAmount(order) | currency:'COP':'symbol':'1.0-0' }}</span></div><div class="flex justify-between text-slate-500"><span>Impuestos (IVA)</span><span>{{ taxAmount(order) | currency:'COP':'symbol':'1.0-0' }}</span></div><div class="flex justify-between border-t border-slate-200 pt-2 text-xl font-black text-slate-900"><span>Total pagar</span><span class="text-emerald-600">{{ order.totalAmount | currency:'COP':'symbol':'1.0-0' }}</span></div></div>
            @if (order.status === 'COMPLETED') {
              <button (click)="cancelOrder(order.orderId)" class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                Cancelar venta
              </button>
            } @else {
              <span class="mt-4 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Anulado por: {{ order.cancelledBy?.username || 'Usuario' }}</span>
            }
            </div>
          }
        </section>
      }
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
  invoiceType = '';

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
      sectionId: this.selectedSectionId() || undefined,
      invoiceType: this.invoiceType || undefined
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
    this.invoiceType = '';
    this.loadOrders();
  }

  selectOrder(orderId: number): void {
    this.posService.getOrder(orderId).subscribe({
      next: order => this.selectedOrder.set(order),
      error: () => this.errorMessage.set('No fue posible cargar el detalle de la orden.')
    });
  }

  closeOrderDetail(): void {
    this.selectedOrder.set(null);
  }

  baseAmount(order: Order): number {
    return order.details.reduce((total, detail) => total + detail.subtotal - detail.taxAmount, 0);
  }

  taxAmount(order: Order): number {
    return order.details.reduce((total, detail) => total + detail.taxAmount, 0);
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
