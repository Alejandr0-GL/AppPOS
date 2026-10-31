import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ReceiptData } from '../../models/receipt.models';
import { EscPosPaperWidth, EscPosPrintService } from '../../services/escpos-print.service';

type ReceiptPaper = '58' | '80';

/**
 * POS-05 · Recibo de venta para impresoras térmicas.
 * Vista previa en pantalla + impresión nativa (window.print()).
 * El CSS de impresión vive en src/styles.scss (bloque "Recibo POS-05") para poder
 * ocultar el sidebar, el topbar y los botones de navegación de toda la aplicación.
 */
@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()'
  },
  template: `
    <div
      class="receipt-overlay fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmación de venta"
      (click)="close()">
      <div class="receipt-shell my-auto w-full max-w-md" (click)="$event.stopPropagation()">

        <div class="receipt-panel overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">

          <!-- Tarjeta de confirmación (ligera, no se imprime) -->
          <header class="receipt-header px-6 pb-5 pt-6 text-center">
            <span
              class="mx-auto grid h-12 w-12 place-items-center rounded-full"
              [class.bg-emerald-100]="success()"
              [class.text-emerald-600]="success()"
              [class.bg-slate-100]="!success()"
              [class.text-slate-500]="!success()">
              @if (success()) {
                <svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              } @else {
                <svg class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6M7 3.75h7.5L19.5 9v10.5A1.5 1.5 0 0118 21H7a1.5 1.5 0 01-1.5-1.5V5.25A1.5 1.5 0 017 3.75z" />
                </svg>
              }
            </span>

            <h2 class="mt-3 text-xl font-black tracking-tight text-slate-900">
              {{ success() ? '¡Venta completada!' : 'Recibo de venta' }}
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              Orden <span class="font-bold text-slate-700">#{{ data().orderNumber }}</span>
              · {{ data().issuedAt | date:'dd/MM/yyyy HH:mm' }}
            </p>
          </header>

          <!-- Resumen financiero -->
          <section class="receipt-summary mx-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Método de pago</span>
              <span class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-slate-700 ring-1 ring-slate-200">{{ data().paymentMethod }}</span>
            </div>

            <div class="mt-3 flex items-end justify-between gap-2 border-t border-slate-200 pt-3">
              <span class="text-sm font-semibold text-slate-500">Total cobrado</span>
              <span class="text-2xl font-black leading-none text-emerald-600">{{ money(data().total) }}</span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2">
              <div class="rounded-lg bg-white p-2 text-center ring-1 ring-slate-200">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Recibido</span>
                <span class="block text-sm font-bold text-slate-800">{{ receivedLabel() }}</span>
              </div>
              <div class="rounded-lg bg-emerald-50 p-2 text-center ring-1 ring-emerald-200">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Cambio</span>
                <span class="block text-base font-black text-emerald-700">{{ changeLabel() }}</span>
              </div>
            </div>
          </section>

          <!-- Desglose compacto de ítems -->
          <section class="receipt-items mx-5 mt-4">
            <p class="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Productos</span>
              <span>{{ data().items.length }} {{ data().items.length === 1 ? 'ítem' : 'ítems' }}</span>
            </p>
            <ul class="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              @for (item of data().items; track $index) {
                <li class="flex items-center justify-between gap-3 px-3 py-2">
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold text-slate-800">{{ item.name }}</span>
                    <span class="block text-[11px] text-slate-400">{{ item.quantity }} × {{ money(item.unitPrice) }}</span>
                  </span>
                  <span class="whitespace-nowrap text-sm font-bold text-slate-700">{{ money(item.subtotal) }}</span>
                </li>
              }
            </ul>
            @if (data().taxAmount > 0) {
              <p class="mt-2 text-right text-[11px] font-semibold text-slate-400">IVA incluido: {{ money(data().taxAmount) }}</p>
            }
          </section>

          <!-- Pie: acciones del modal (no se imprime) -->
          <footer class="receipt-footer mt-5 border-t border-slate-100 bg-white px-5 py-4">
            <div class="flex flex-col-reverse items-stretch justify-center gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                (click)="close()"
                class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                Cerrar
              </button>
              <button
                type="button"
                (click)="printReceipt()"
                [disabled]="escpos.isPrinting()"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-progress disabled:opacity-60">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659" />
                </svg>
                {{ escpos.isPrinting() ? 'Imprimiendo...' : 'Imprimir recibo' }}
              </button>
            </div>

            <!-- POS-05: impresión nativa ESC/POS (WebUSB) con fallback al navegador -->
            <div class="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px]">
              @if (escpos.printerName()) {
                <span class="font-bold text-slate-500">USB: {{ escpos.printerName() }}</span>
              } @else if (escpos.isSupported) {
                <button
                  type="button"
                  (click)="connectPrinter()"
                  class="font-bold text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700">
                  Conectar impresora USB
                </button>
              }
              @if (printMessage()) {
                <span class="font-bold text-emerald-600">{{ printMessage() }}</span>
              }
              @if (escpos.lastError()) {
                <span class="font-bold text-amber-600">{{ escpos.lastError() }}</span>
              }
            </div>
          </footer>
        </div><!-- /receipt-panel -->
      </div><!-- /receipt-shell -->

      <!-- Ticket térmico: invisible en pantalla (display:none) y visible sólo en @media print -->
      <div
        id="thermal-receipt"
        class="receipt-print-area receipt-paper"
        [class.receipt-paper--58]="paperWidth() === '58'"
        [class.receipt-paper--80]="paperWidth() === '80'"
        aria-hidden="true">

          <header class="text-center">
            <h1 class="text-[13px] font-black uppercase leading-tight">{{ data().company.name }}</h1>
            @if (data().company.nit) {
              <p class="receipt-header-line">NIT: {{ data().company.nit }}</p>
            }
            @if (data().company.address) {
              <p class="receipt-header-line">{{ data().company.address }}</p>
            }
            @if (data().company.phone) {
              <p class="receipt-header-line">Tel: {{ data().company.phone }}</p>
            }
            @if (data().company.email) {
              <p class="receipt-header-line">{{ data().company.email }}</p>
            }
            <p class="mt-2 border-y border-dashed border-black py-1 font-bold uppercase">{{ data().documentTitle }}</p>
          </header>

          <section class="mt-2">
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Orden</span><span class="font-bold">#{{ data().orderNumber }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Fecha</span><span>{{ data().issuedAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Cajero</span><span class="text-right">{{ data().cashier }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Unidad</span><span class="text-right">{{ data().sectionName }}</span></div>
          </section>

          <section class="mt-2 border-t border-dashed border-black pt-1">
            <p class="font-bold uppercase">Cliente</p>
            <p class="uppercase">{{ data().customerName }}</p>
            <div class="flex justify-between gap-2">
              <span>{{ data().customerDocumentType }}</span>
              <span>{{ data().customerDocumentNumber }}</span>
            </div>
            @if (data().customerAddress) {
              <p>{{ data().customerAddress }}</p>
            }
            @if (data().customerPhone) {
              <p>Tel: {{ data().customerPhone }}</p>
            }
          </section>

          <table class="mt-2 w-full border-t border-dashed border-black text-[10px]">
            <thead>
              <tr class="text-[10px] uppercase">
                <th class="w-8 py-1 pr-1 text-left">Cant</th>
                <th class="py-1 text-left">Detalle</th>
                <th class="w-12 py-1 text-right">Vr. Un</th>
                <th class="w-14 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (item of data().items; track $index) {
                <tr class="border-t border-slate-300">
                  <td class="py-0.5 align-top">{{ item.quantity }}</td>
                  <td class="py-0.5 align-top uppercase">
                    {{ item.name }}
                    @if (item.sku) {
                      <span class="receipt-sku block text-[10px] normal-case text-slate-500">{{ item.sku }}</span>
                    }
                  </td>
                  <td class="whitespace-nowrap py-0.5 text-right align-top">{{ money(item.unitPrice) }}</td>
                  <td class="whitespace-nowrap py-0.5 text-right align-top">{{ money(item.subtotal) }}</td>
                </tr>
              }
            </tbody>
          </table>

          <section class="mt-2 border-t border-dashed border-black pt-1">
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Subtotal</span><span>{{ money(data().subtotal) }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">IVA / Impuestos</span><span>{{ money(data().taxAmount) }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Descuentos</span><span>{{ money(data().discount) }}</span></div>
            <div class="mt-1 flex justify-between gap-2 border-t border-black pt-1 text-[14px] font-black">
              <span>TOTAL</span>
              <span>{{ money(data().total) }}</span>
            </div>
          </section>

          <section class="mt-2 border-t border-dashed border-black pt-1">
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Pago</span><span class="font-bold uppercase">{{ data().paymentMethod }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Recibido</span><span>{{ receivedLabel() }}</span></div>
            <div class="flex justify-between gap-2"><span class="receipt-summary-label">Cambio</span><span>{{ changeLabel() }}</span></div>
          </section>

          @if (data().status !== 'COMPLETED') {
            <p class="mt-2 border border-black py-1 text-center font-black uppercase">Documento {{ data().status }}</p>
          }

          <footer class="mt-2 border-t border-dashed border-black pt-2 text-center">
            <p class="font-bold">{{ data().thanksMessage }}</p>
            <p class="receipt-footnote mt-1 text-[10px] leading-snug">{{ data().policyMessage }}</p>
            <p class="receipt-footnote mt-2 text-[10px]">Impreso: {{ printedAt() | date:'dd/MM/yyyy HH:mm' }}</p>
            <p class="receipt-footnote text-[10px]">{{ data().company.name }} · AppPOS</p>
          </footer>
      </div><!-- /thermal-receipt -->
    </div>
  `
})
export class ReceiptComponent {
  readonly data = input.required<ReceiptData>();
  readonly success = input(false);
  readonly closed = output<void>();

  /** POS-05: impresión nativa ESC/POS vía WebUSB (window.print() queda como fallback). */
  readonly escpos = inject(EscPosPrintService);
  readonly printMessage = signal('');

  constructor() {
    // Si ya hay una impresora autorizada para este origen se muestra sin pedir permiso.
    void this.escpos.hasAuthorizedPrinter();
  }

  readonly papers: ReceiptPaper[] = ['58', '80'];

  /** POS-05: 58 mm por defecto. El selector visual se reactivará cuando exista
   *  configuración global de impresora; las clases CSS (.receipt-paper--58/--80)
   *  y el tipo ReceiptPaper quedan listos para ese momento. */
  readonly paperWidth = signal<ReceiptPaper>('58');

  readonly printedAt = signal(new Date());

  private readonly formatter = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  setPaper(paper: ReceiptPaper): void {
    this.paperWidth.set(paper);
  }

  print(): void {
    this.printedAt.set(new Date());
    // Se espera un ciclo de render para que la marca de tiempo salga en el ticket.
    setTimeout(() => window.print(), 60);
  }

  /**
   * POS-05: imprime primero por USB en ESC/POS nativo.
   * Sin impresora emparejada (o si falla), cae al diálogo del navegador.
   */
  async printReceipt(): Promise<void> {
    this.printMessage.set('');

    if (this.escpos.isSupported) {
      const paper: EscPosPaperWidth = this.paperWidth() === '80' ? '80mm' : '58mm';
      const printed = await this.escpos.printReceipt(this.data(), paper);
      if (printed) {
        this.printMessage.set('Recibo enviado a la impresora USB.');
        return;
      }
    }

    // Fallback garantizado: @media print + window.print().
    this.print();
  }

  /** Autoriza una impresora USB (WebUSB) para imprimir en ESC/POS nativo. */
  async connectPrinter(): Promise<void> {
    this.printMessage.set('');
    const connected = await this.escpos.connect();
    this.printMessage.set(
      connected
        ? `Impresora conectada: ${this.escpos.printerName()}`
        : 'Puedes seguir imprimiendo con el diálogo del navegador.'
    );
  }

  close(): void {
    this.closed.emit();
  }

  receivedLabel(): string {
    return this.data().receivedAmount == null ? 'No registrado' : this.money(this.data().receivedAmount);
  }

  changeLabel(): string {
    return this.data().changeAmount == null ? '-' : this.money(this.data().changeAmount);
  }

  money(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }
    return `$ ${this.formatter.format(value)}`;
  }
}
