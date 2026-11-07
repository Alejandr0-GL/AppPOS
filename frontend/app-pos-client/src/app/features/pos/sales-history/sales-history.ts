import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Order, OrderSummary } from '../../../shared/models/pos.models';
import { ReceiptData } from '../../../shared/models/receipt.models';
import { buildReceiptData, isPendingPayment, paymentMethodLabel, statusLabel } from '../../../shared/utils/receipt.mapper';
import { ReceiptComponent } from '../../../shared/components/receipt/receipt';
import { PosService } from '../services/pos.service';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptComponent],
  template: `
    <section class="p-4 md:p-6 space-y-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">POS-03</p>
          <h2 class="text-2xl font-black text-slate-900">Historial de ventas</h2>
          <p class="text-sm text-slate-500">Consulta comprobantes y revisa cada producto vendido.</p>
        </div>
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
            <option value="">Todos</option>
            <option value="COMPLETED">Completadas</option>
            <option value="PAID">Pagadas</option>
            <option value="PENDING">Pendientes de pago</option>
            <option value="CANCELLED">Canceladas</option>
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
                    <td class="px-4 py-3 font-semibold text-slate-600">{{ paymentLabel(order.paymentMethod) }}</td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [ngClass]="statusBadgeClass(order.status)">{{ formatStatus(order.status) }}</span></td>
                    <td class="px-4 py-3 text-right font-black text-slate-800">{{ order.totalAmount | currency:'COP':'symbol':'1.0-0' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="9" class="px-4 py-12 text-center text-sm text-slate-400">No hay ventas para los filtros seleccionados.</td></tr>
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
            <div class="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 text-sm md:grid-cols-4"><div><span class="block text-xs uppercase text-slate-500">Cliente</span><strong class="text-slate-800">{{ order.customer?.name || 'Consumidor final' }}</strong><span class="block text-slate-500">Doc: {{ order.customer?.documentNumber || 'Sin documento' }}</span></div><div><span class="block text-xs uppercase text-slate-500">Cajero</span><strong class="text-slate-800">{{ order.user?.username || 'Sin usuario' }}</strong><span class="block text-slate-500">ID: {{ order.user?.userId || '-' }}</span></div><div><span class="block text-xs uppercase text-slate-500">Método de pago</span><strong class="text-slate-800">{{ paymentLabel(order.paymentMethod) }}</strong></div><div><span class="block text-xs uppercase text-slate-500">Estado</span><span class="rounded-full px-2 py-1 text-xs font-bold" [ngClass]="statusBadgeClass(order.status)">{{ formatStatus(order.status) }}</span></div></div>
            <div class="flex-1 overflow-y-auto p-5"><h4 class="mb-3 font-bold text-slate-800">Productos</h4><div class="overflow-x-auto"><table class="w-full min-w-[680px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Producto / SKU</th><th class="px-3 py-2">Cantidad</th><th class="px-3 py-2">Precio unitario</th><th class="px-3 py-2">IVA / Tax</th><th class="px-3 py-2 text-right">Subtotal</th></tr></thead><tbody class="divide-y divide-slate-100">
              @for (detail of order.details; track detail.orderDetailId) {
                <tr><td class="px-3 py-3"><strong class="block text-slate-800">{{ detail.description || detail.product?.name || 'Producto #' + detail.productId }}@if (detail.description) { <span class="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Otros</span> }</strong><span class="text-xs text-slate-500">SKU: {{ detail.product?.sku || 'Sin SKU' }}</span></td><td class="px-3 py-3 text-slate-700">{{ detail.quantity }}</td><td class="px-3 py-3 text-slate-700">{{ detail.unitPrice | currency:'COP':'symbol':'1.0-0' }}@if (detail.listPrice != null && detail.listPrice !== detail.unitPrice) {<span class="block text-xs text-slate-400">Original: <span class="line-through">{{ detail.listPrice | currency:'COP':'symbol':'1.0-0' }}</span> <span class="font-bold" [class.text-emerald-600]="detail.unitPrice > detail.listPrice" [class.text-amber-600]="detail.unitPrice < detail.listPrice">({{ detail.unitPrice > detail.listPrice ? '+' : '' }}{{ detail.unitPrice - detail.listPrice | currency:'COP':'symbol':'1.0-0' }})</span></span>}</td><td class="px-3 py-3 text-slate-700">{{ detail.taxAmount | currency:'COP':'symbol':'1.0-0' }}</td><td class="px-3 py-3 text-right font-bold text-slate-800">{{ detail.subtotal | currency:'COP':'symbol':'1.0-0' }}</td></tr>
              }
              </tbody></table></div>
              <!-- POS-07: motivo único del ajuste de precio de la venta -->
              @if (order.priceChangeReason) {
                <p class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><span class="font-bold">Motivo del ajuste de precio:</span> {{ order.priceChangeReason }}</p>
              }
            </div>
            <div class="border-t border-slate-200 p-5"><div class="ml-auto max-w-sm space-y-2 text-sm"><div class="flex justify-between text-slate-500"><span>Subtotal base</span><span>{{ baseAmount(order) | currency:'COP':'symbol':'1.0-0' }}</span></div><div class="flex justify-between text-slate-500"><span>Impuestos (IVA)</span><span>{{ taxAmount(order) | currency:'COP':'symbol':'1.0-0' }}</span></div>@if (order.receivedAmount != null) {<div class="flex justify-between text-slate-500"><span>Efectivo recibido</span><span>{{ order.receivedAmount | currency:'COP':'symbol':'1.0-0' }}</span></div><div class="flex justify-between text-slate-500"><span>Cambio</span><span>{{ (order.changeAmount ?? 0) | currency:'COP':'symbol':'1.0-0' }}</span></div>}<div class="flex justify-between border-t border-slate-200 pt-2 text-xl font-black text-slate-900"><span>Total pagar</span><span class="text-emerald-600">{{ order.totalAmount | currency:'COP':'symbol':'1.0-0' }}</span></div></div>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <button (click)="openReceipt(order)" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-600">
                  Ver recibo
                </button>
                @if (isPending(order.status)) {
                  <button (click)="openPayment(order)" class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">
                    Marcar como pagada
                  </button>
                }
                @if (order.status === 'CANCELLED') {
                  <span class="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">Anulado por: {{ order.cancelledBy?.username || 'Usuario' }}</span>
                } @else {
                  <button (click)="cancelOrder(order.orderId)" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                    Cancelar venta
                  </button>
                }
              </div>
            </div>
          }
        </section>
      }

      <!-- POS-06: registrar el pago de una venta a crédito -->
      @if (paymentOrder(); as order) {
        <div class="fixed inset-0 z-[65] bg-slate-950/60" (click)="closePayment()"></div>
        <section class="fixed inset-4 z-[66] m-auto h-fit max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" aria-label="Registrar pago">
          <div class="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-amber-600">Registrar pago</p>
              <h3 class="text-xl font-black text-slate-900">Orden #{{ order.orderId }}</h3>
            </div>
            <button (click)="closePayment()" class="rounded-md px-2 text-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">&times;</button>
          </div>

          <div class="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
            <div class="flex justify-between gap-2"><span class="text-slate-500">Cliente</span><strong class="truncate text-slate-800">{{ order.customer?.name || 'Consumidor final' }}</strong></div>
            <div class="mt-1 flex justify-between gap-2"><span class="text-slate-500">Total a pagar</span><strong class="text-emerald-600">{{ order.totalAmount | currency:'COP':'symbol':'1.0-0' }}</strong></div>
          </div>

          <div class="mt-4">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Método de pago final</p>
            <div class="mt-1 flex gap-2">
              <!-- POS-07: mismo estilo de selección que el POS (antes el activo quedaba blanco sobre blanco) -->
              <button type="button" (click)="paymentMethodChoice = 'CASH'" [attr.aria-pressed]="paymentMethodChoice === 'CASH'" [class]="choiceButtonClass(paymentMethodChoice === 'CASH')">Efectivo</button>
              <button type="button" (click)="paymentMethodChoice = 'TRANSFER'" [attr.aria-pressed]="paymentMethodChoice === 'TRANSFER'" [class]="choiceButtonClass(paymentMethodChoice === 'TRANSFER')">Transferencia</button>
            </div>
          </div>

          @if (paymentMethodChoice === 'CASH') {
            <label class="mt-3 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Efectivo recibido
              <input type="number" min="0" step="1000" [(ngModel)]="paymentReceived" placeholder="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-800" />
            </label>
            <div class="mt-1 flex justify-between text-xs font-bold" [class.text-red-600]="paymentReceived !== null && paymentReceived > 0 && paymentChange < 0" [class.text-slate-600]="paymentReceived === null || paymentReceived <= 0 || paymentChange >= 0">
              <span>Cambio</span>
              <span>{{ paymentReceived !== null && paymentReceived > 0 ? (paymentChange | currency:'COP':'symbol':'1.0-0') : '$ 0' }}</span>
            </div>
          }

          @if (paymentError()) {
            <p class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{{ paymentError() }}</p>
          }

          <div class="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button type="button" (click)="closePayment()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" (click)="confirmPayment()" [disabled]="paymentSaving()" class="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-progress disabled:opacity-60">
              {{ paymentSaving() ? 'Guardando...' : 'Confirmar pago' }}
            </button>
          </div>
        </section>
      }

      @if (receiptData(); as receipt) {
        <app-receipt [data]="receipt" (closed)="closeReceipt()"></app-receipt>
      }
    </section>
  `
})
export class SalesHistoryComponent {
  private readonly posService = inject(PosService);
  private readonly route = inject(ActivatedRoute);

  orders = signal<OrderSummary[]>([]);
  selectedOrder = signal<Order | null>(null);
  receiptData = signal<ReceiptData | null>(null);

  // POS-06: cobro de ventas a crédito (PENDING → PAID)
  paymentOrder = signal<OrderSummary | null>(null);
  paymentMethodChoice: 'CASH' | 'TRANSFER' = 'CASH';
  paymentReceived: number | null = null;
  paymentSaving = signal(false);
  paymentError = signal('');

  selectedSectionId = this.posService.selectedSectionId;
  errorMessage = signal('');
  startDate = '';
  endDate = '';
  customerId: number | null = null;
  // Permite abrir el historial ya filtrado, p. ej. /sales-history?status=PENDING desde el dashboard.
  status = this.initialStatusFilter();
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
    this.status = '';
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

  /** POS-05: reimpresión del recibo de una venta ya registrada. */
  openReceipt(order: Order): void {
    this.receiptData.set(buildReceiptData(order));
  }

  closeReceipt(): void {
    this.receiptData.set(null);
  }

  paymentLabel(method?: string | null): string {
    return paymentMethodLabel(method);
  }

  formatStatus(status?: string | null): string {
    return statusLabel(status);
  }

  isPending(status?: string | null): boolean {
    return isPendingPayment(status);
  }

  statusBadgeClass(status?: string | null): string {
    switch ((status ?? '').trim().toUpperCase()) {
      case 'COMPLETED':
      case 'PAID':
        return 'bg-emerald-100 text-emerald-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  private initialStatusFilter(): string {
    const status = (this.route.snapshot.queryParamMap.get('status') ?? '').toUpperCase();
    return ['COMPLETED', 'PAID', 'PENDING', 'CANCELLED'].includes(status) ? status : '';
  }

  // ---- POS-06: cobro de una venta a crédito ----

  /** POS-07: botón de selección (activo en azul), un solo juego de colores por estado. */
  choiceButtonClass(active: boolean): string {
    const base = 'flex-1 rounded-lg border py-2 text-sm font-bold transition-colors';
    return active
      ? `${base} border-indigo-600 bg-indigo-600 text-white shadow-sm`
      : `${base} border-slate-300 bg-white text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white`;
  }

  get paymentChange(): number {
    return (this.paymentReceived ?? 0) - (this.paymentOrder()?.totalAmount ?? 0);
  }

  openPayment(order: OrderSummary): void {
    this.paymentOrder.set(order);
    this.paymentMethodChoice = 'CASH';
    this.paymentReceived = null;
    this.paymentError.set('');
  }

  closePayment(): void {
    this.paymentOrder.set(null);
    this.paymentError.set('');
  }

  confirmPayment(): void {
    const order = this.paymentOrder();
    if (!order || this.paymentSaving()) {
      return;
    }

    const received = this.paymentMethodChoice === 'CASH' && this.paymentReceived && this.paymentReceived > 0
      ? this.paymentReceived
      : null;

    if (received !== null && received < order.totalAmount) {
      this.paymentError.set('El efectivo recibido es menor al total a pagar.');
      return;
    }

    this.paymentSaving.set(true);
    this.paymentError.set('');

    this.posService.payOrder(order.orderId, {
      paymentMethod: this.paymentMethodChoice,
      receivedAmount: received
    }).subscribe({
      next: () => {
        this.paymentSaving.set(false);
        this.closePayment();
        this.loadOrders();
        // Si el detalle de esta orden está abierto, recargarlo para que la reimpresión
        // muestre el estado PAID con el recibido/cambio reales (no "Pendiente").
        if (this.selectedOrder()?.orderId === order.orderId) {
          this.selectOrder(order.orderId);
        }
      },
      error: error => {
        this.paymentSaving.set(false);
        this.paymentError.set(error.error?.message || 'No fue posible registrar el pago.');
      }
    });
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
