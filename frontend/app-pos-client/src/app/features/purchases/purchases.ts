import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePurchaseDto, Product, PurchaseSummary, Supplier } from '../../shared/models/pos.models';
import { PosService, Section } from '../pos/services/pos.service';
import { SupplierFormModalComponent } from '../suppliers/supplier-form-modal';
import { PurchasesService } from './services/purchases.service';

interface PurchaseLine {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  purchasePrice: number;
}

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, SupplierFormModalComponent],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">PUR-01</p>
          <h2 class="text-2xl font-black text-slate-900">Compras y recepción de mercadería</h2>
          <p class="text-sm text-slate-500">Registra ingresos de mercadería y actualiza el costo y el stock por unidad de negocio.</p>
        </div>
        <button (click)="goToNewPurchase()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Nueva compra</button>
      </header>

      <div class="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-bold">
        <button (click)="activeTab.set('list')" [class.bg-white]="activeTab() === 'list'" [class.shadow-sm]="activeTab() === 'list'" [class.text-indigo-700]="activeTab() === 'list'" class="flex-1 rounded-lg px-4 py-2 text-slate-600">Compras realizadas</button>
        <button (click)="activeTab.set('new')" [class.bg-white]="activeTab() === 'new'" [class.shadow-sm]="activeTab() === 'new'" [class.text-indigo-700]="activeTab() === 'new'" class="flex-1 rounded-lg px-4 py-2 text-slate-600">Nueva compra</button>
      </div>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div>
      }
      @if (infoMessage()) {
        <div class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">{{ infoMessage() }}</div>
      }

      @if (activeTab() === 'list') {
        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Desde
            <input [(ngModel)]="startDate" (ngModelChange)="loadPurchases()" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Hasta
            <input [(ngModel)]="endDate" (ngModelChange)="loadPurchases()" type="date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="flex items-end gap-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <input type="checkbox" [(ngModel)]="allSections" (ngModelChange)="loadPurchases()" class="h-4 w-4 rounded border-slate-300" />
            Todas las unidades
          </label>
          <button (click)="loadPurchases()" class="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Actualizar</button>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{{ purchases().length }} compras registradas</div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-4 py-3">Fecha / hora</th>
                  <th class="px-4 py-3">Proveedor</th>
                  <th class="px-4 py-3">Factura</th>
                  <th class="px-4 py-3">Sección</th>
                  <th class="px-4 py-3">Ítems</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3 text-right">Total</th>
                  <th class="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (purchase of purchases(); track purchase.purchaseId) {
                  <tr>
                    <td class="px-4 py-3 text-slate-600">{{ purchase.date | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="px-4 py-3 font-bold text-slate-800">{{ purchase.supplier?.name || 'Sin proveedor' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ purchase.invoiceNumber || 'Sin número' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ sectionNames(purchase) }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ itemCount(purchase) }}</td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="purchase.status === 'COMPLETED'" [class.text-emerald-700]="purchase.status === 'COMPLETED'" [class.bg-red-100]="purchase.status === 'CANCELED'" [class.text-red-700]="purchase.status === 'CANCELED'">{{ purchase.status === 'CANCELED' ? 'Anulada' : 'Activa' }}</span></td>
                    <td class="px-4 py-3 text-right font-black text-slate-800">{{ purchase.totalAmount | currency:'COP':'symbol':'1.0-0' }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex justify-end gap-2">
                        <button (click)="openDetail(purchase)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Ver detalle</button>
                        @if (purchase.status === 'COMPLETED') {
                          <button (click)="cancelPurchase(purchase)" [disabled]="cancellingPurchaseId() === purchase.purchaseId" class="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{{ cancellingPurchaseId() === purchase.purchaseId ? 'Anulando...' : 'Anular' }}</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="px-4 py-12 text-center text-sm text-slate-400">No hay compras para los filtros seleccionados.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (activeTab() === 'new') {
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div class="space-y-4">
            <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
              <label class="text-xs font-bold uppercase text-slate-500">Proveedor *
                <span class="mt-1 flex gap-2">
                  <select [(ngModel)]="form.supplierId" class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                    <option [ngValue]="0">Seleccionar proveedor</option>
                    @for (supplier of suppliers(); track supplier.supplierId) {
                      <option [ngValue]="supplier.supplierId">{{ supplier.name }}</option>
                    }
                  </select>
                  <button type="button" (click)="openQuickSupplier()" title="Crear proveedor" aria-label="Crear proveedor" class="w-10 shrink-0 rounded-lg bg-slate-900 text-lg font-bold text-white hover:bg-slate-700">+</button>
                </span>
              </label>
              <label class="text-xs font-bold uppercase text-slate-500">Número de factura
                <input [(ngModel)]="form.invoiceNumber" maxlength="50" placeholder="Ej. FE-00123" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
              </label>
              <label class="text-xs font-bold uppercase text-slate-500">Unidad de negocio
                <select [(ngModel)]="form.sectionId" [disabled]="true" class="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-normal text-slate-500">
                  @for (section of sections(); track section.sectionId) {
                    <option [ngValue]="section.sectionId">{{ section.name }}</option>
                  }
                </select>
                <span class="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">Se controla desde el selector global de la barra superior.</span>
              </label>
              <label class="text-xs font-bold uppercase text-slate-500">Observaciones
                <input [(ngModel)]="form.observations" maxlength="250" placeholder="Notas de recepción" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
              </label>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 class="mb-3 font-bold text-slate-800">Agregar producto</h3>
              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_140px_auto]">
                <label class="text-xs font-bold uppercase text-slate-500">Producto
                  <select [(ngModel)]="newLine.productId" (ngModelChange)="onProductPicked($event)" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
                    <option [ngValue]="0">{{ products().length ? 'Seleccionar producto' : 'No hay productos en esta unidad' }}</option>
                    @for (product of products(); track product.productId) {
                      <option [ngValue]="product.productId">{{ product.name }} · {{ product.sku }}</option>
                    }
                  </select>
                </label>
                <label class="text-xs font-bold uppercase text-slate-500">Cantidad
                  <input [(ngModel)]="newLine.quantity" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
                </label>
                <label class="text-xs font-bold uppercase text-slate-500">Costo unitario
                  <input [(ngModel)]="newLine.purchasePrice" type="number" min="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
                </label>
                <button (click)="addLine()" class="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Agregar</button>
              </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[720px] text-left text-sm">
                  <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th class="px-4 py-3">Producto</th>
                      <th class="px-4 py-3">SKU</th>
                      <th class="px-4 py-3">Cantidad</th>
                      <th class="px-4 py-3">Costo unitario</th>
                      <th class="px-4 py-3 text-right">Subtotal</th>
                      <th class="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (line of lines(); track line.productId) {
                      <tr>
                        <td class="px-4 py-3 font-bold text-slate-800">{{ line.name }}</td>
                        <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ line.sku }}</td>
                        <td class="px-4 py-3"><input [ngModel]="line.quantity" (ngModelChange)="updateLine(line.productId, 'quantity', $event)" type="number" min="1" class="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" /></td>
                        <td class="px-4 py-3"><input [ngModel]="line.purchasePrice" (ngModelChange)="updateLine(line.productId, 'purchasePrice', $event)" type="number" min="0" class="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm" /></td>
                        <td class="px-4 py-3 text-right font-bold text-slate-800">{{ (line.quantity * line.purchasePrice) | currency:'COP':'symbol':'1.0-0' }}</td>
                        <td class="px-4 py-3 text-right"><button (click)="removeLine(line.productId)" class="text-xs font-bold text-red-600 hover:text-red-700">Quitar</button></td>
                      </tr>
                    } @empty {
                      <tr><td colspan="6" class="px-4 py-10 text-center text-sm text-slate-400">Agrega productos para registrar la compra.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside class="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="font-bold text-slate-800">Resumen de la compra</h3>
            <div class="flex justify-between text-sm text-slate-600"><span>Líneas</span><span>{{ lines().length }}</span></div>
            <div class="flex justify-between text-sm text-slate-600"><span>Unidades</span><span>{{ totalUnits() }}</span></div>
            <div class="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900"><span>Total</span><span class="text-emerald-600">{{ linesTotal() | currency:'COP':'symbol':'1.0-0' }}</span></div>
            <button (click)="savePurchase()" [disabled]="saving()" class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Registrando...' : 'Registrar compra' }}</button>
            <button (click)="resetForm()" class="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Limpiar</button>
          </aside>
        </div>
      }
    </section>

    @if (selectedPurchase(); as purchase) {
      <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeDetail()"></div>
      <section class="fixed inset-4 z-50 m-auto flex max-h-[calc(100vh-2rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" aria-label="Detalle de compra">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Detalle de compra</p>
            <h3 class="text-2xl font-black text-slate-900">Compra #{{ purchase.purchaseId }}</h3>
            <p class="text-sm text-slate-500">{{ purchase.date | date:'dd/MM/yyyy HH:mm' }} · {{ purchase.supplier?.name || 'Sin proveedor' }}</p>
          </div>
          <button (click)="closeDetail()" class="rounded-md px-3 py-1 text-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar detalle">&times;</button>
        </div>

        <div class="grid gap-3 border-b border-slate-200 bg-slate-50 p-5 text-sm md:grid-cols-4">
          <div><span class="block text-xs uppercase text-slate-500">Factura</span><strong class="text-slate-800">{{ purchase.invoiceNumber || 'Sin número' }}</strong></div>
          <div><span class="block text-xs uppercase text-slate-500">Unidad</span><strong class="text-slate-800">{{ sectionNames(purchase) }}</strong></div>
          <div><span class="block text-xs uppercase text-slate-500">Registrado por</span><strong class="text-slate-800">{{ purchase.user?.username || 'Sin usuario' }}</strong></div>
          <div><span class="block text-xs uppercase text-slate-500">Estado</span><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="purchase.status === 'COMPLETED'" [class.text-emerald-700]="purchase.status === 'COMPLETED'" [class.bg-red-100]="purchase.status === 'CANCELED'" [class.text-red-700]="purchase.status === 'CANCELED'">{{ purchase.status === 'CANCELED' ? 'Anulada' : 'Activa' }}</span></div>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <h4 class="mb-3 font-bold text-slate-800">Productos recibidos</h4>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-3 py-2">Producto / SKU</th>
                  <th class="px-3 py-2">Cantidad</th>
                  <th class="px-3 py-2">Costo unitario</th>
                  <th class="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (detail of purchase.details; track detail.purchaseDetailId) {
                  <tr>
                    <td class="px-3 py-3"><strong class="block text-slate-800">{{ detail.product?.name || 'Producto #' + detail.productId }}</strong><span class="text-xs text-slate-500">SKU: {{ detail.product?.sku || 'Sin SKU' }}</span></td>
                    <td class="px-3 py-3 text-slate-700">{{ detail.quantity }}</td>
                    <td class="px-3 py-3 text-slate-700">{{ detail.purchasePrice | currency:'COP':'symbol':'1.0-0' }}</td>
                    <td class="px-3 py-3 text-right font-bold text-slate-800">{{ detail.subtotal | currency:'COP':'symbol':'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (purchase.observations) {
            <p class="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"><strong>Observaciones:</strong> {{ purchase.observations }}</p>
          }
        </div>

        <div class="border-t border-slate-200 p-5">
          <div class="ml-auto max-w-sm text-xl font-black text-slate-900">
            <div class="flex justify-between border-t border-slate-200 pt-2"><span>Total compra</span><span class="text-emerald-600">{{ purchase.totalAmount | currency:'COP':'symbol':'1.0-0' }}</span></div>
          </div>
        </div>
      </section>
    }

    @if (quickSupplierOpen()) {
      <app-supplier-form-modal (saved)="onSupplierCreated($event)" (closed)="quickSupplierOpen.set(false)" />
    }
  `
})
export class PurchasesComponent {
  private readonly purchasesService = inject(PurchasesService);
  private readonly posService = inject(PosService);

  purchases = signal<PurchaseSummary[]>([]);
  suppliers = signal<Supplier[]>([]);
  products = signal<Product[]>([]);
  sections = signal<Section[]>([]);
  lines = signal<PurchaseLine[]>([]);
  activeTab = signal<'list' | 'new'>('list');
  selectedPurchase = signal<PurchaseSummary | null>(null);
  errorMessage = signal('');
  successMessage = signal('');
  infoMessage = signal('');
  saving = signal(false);
  quickSupplierOpen = signal(false);
  cancellingPurchaseId = signal<number | null>(null);

  startDate = '';
  endDate = '';
  allSections = false;

  form: { supplierId: number; invoiceNumber: string; sectionId: number | null; observations: string } = this.emptyForm();
  newLine: { productId: number; quantity: number; purchasePrice: number } = this.emptyLine();

  linesTotal = computed(() => this.lines().reduce((total, line) => total + line.quantity * line.purchasePrice, 0));
  totalUnits = computed(() => this.lines().reduce((total, line) => total + line.quantity, 0));

  private lastLoadedSectionId: number | null = null;

  private readonly sectionEffect = effect(() => {
    const sectionId = this.posService.selectedSectionId();
    if (!sectionId) return;

    // Solo selectedSectionId es dependencia reactiva; el resto se ejecuta sin rastreo
    // para evitar que las escrituras de señales re-disparen este efecto.
    untracked(() => {
      const sectionChanged = this.lastLoadedSectionId !== null && this.lastLoadedSectionId !== sectionId;

      if (sectionChanged) {
        // La compra en curso pertenece a otra unidad: se descarta para evitar inconsistencias.
        const hadLines = this.lines().length > 0;
        this.lines.set([]);
        this.newLine = this.emptyLine();

        if (hadLines) {
          this.infoMessage.set('Cambiaste de unidad de negocio: se limpió la lista de productos de la compra en curso.');
        }
      }

      this.lastLoadedSectionId = sectionId;
      this.form.sectionId = sectionId;
      this.loadProducts(sectionId);
      this.loadPurchases();
    });
  });

  constructor() {
    this.loadOptions();
  }

  loadOptions(): void {
    this.purchasesService.getSuppliers().subscribe({
      next: suppliers => this.suppliers.set(suppliers),
      error: error => this.showError(error)
    });

    this.posService.getSections().subscribe({
      next: sections => this.sections.set(sections),
      error: error => this.showError(error)
    });
  }

  private loadProducts(sectionId: number): void {
    this.products.set([]);

    this.purchasesService.getProducts(sectionId).subscribe({
      next: products => this.products.set(products),
      error: error => this.showError(error)
    });
  }

  loadPurchases(): void {
    this.errorMessage.set('');
    const sectionId = this.allSections ? undefined : this.posService.selectedSectionId() ?? undefined;

    this.purchasesService.getPurchases({
      sectionId,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined
    }).subscribe({
      next: purchases => this.purchases.set(purchases),
      error: error => this.showError(error)
    });
  }

  goToNewPurchase(): void {
    this.clearMessages();
    this.activeTab.set('new');
  }

  openDetail(purchase: PurchaseSummary): void {
    this.selectedPurchase.set(purchase);
  }

  closeDetail(): void {
    this.selectedPurchase.set(null);
  }

  cancelPurchase(purchase: PurchaseSummary): void {
    if (purchase.status !== 'COMPLETED') return;
    if (this.cancellingPurchaseId() !== null) return;
    if (!confirm(`¿Deseas anular la compra #${purchase.purchaseId}? El stock ingresado será revertido.`)) return;

    this.clearMessages();
    this.cancellingPurchaseId.set(purchase.purchaseId);

    this.purchasesService.cancelPurchase(purchase.purchaseId, 1).subscribe({
      next: response => {
        this.cancellingPurchaseId.set(null);
        this.successMessage.set(response.message);
        this.loadPurchases();
      },
      error: error => {
        this.cancellingPurchaseId.set(null);
        this.showError(error);
      }
    });
  }

  openQuickSupplier(): void {
    this.clearMessages();
    this.quickSupplierOpen.set(true);
  }

  onSupplierCreated(supplier: Supplier): void {
    this.quickSupplierOpen.set(false);
    this.suppliers.set([...this.suppliers(), supplier]);
    this.form.supplierId = supplier.supplierId;
    this.successMessage.set('Proveedor creado y seleccionado correctamente.');
  }

  sectionNames(purchase: PurchaseSummary): string {
    return purchase.sections?.length ? purchase.sections.map(section => section.name).join(', ') : '-';
  }

  itemCount(purchase: PurchaseSummary): number {
    return purchase.details.reduce((total, detail) => total + detail.quantity, 0);
  }

  onProductPicked(productId: number): void {
    const product = this.products().find(item => item.productId === Number(productId));
    this.newLine.purchasePrice = product?.purchasePrice ?? 0;
  }

  addLine(): void {
    this.clearMessages();

    const product = this.products().find(item => item.productId === Number(this.newLine.productId));
    if (!product) {
      this.errorMessage.set('Selecciona un producto para agregarlo a la compra.');
      return;
    }

    const quantity = Number(this.newLine.quantity);
    const purchasePrice = Number(this.newLine.purchasePrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.errorMessage.set('La cantidad debe ser mayor que cero.');
      return;
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      this.errorMessage.set('El costo unitario no puede ser negativo.');
      return;
    }

    const current = this.lines();
    const units = Math.trunc(quantity);
    const existing = current.some(line => line.productId === product.productId);

    this.lines.set(existing
      ? current.map(line => line.productId === product.productId
        ? { ...line, quantity: line.quantity + units, purchasePrice }
        : line)
      : [...current, { productId: product.productId, name: product.name, sku: product.sku, quantity: units, purchasePrice }]);

    this.newLine = this.emptyLine();
  }

  updateLine(productId: number, field: 'quantity' | 'purchasePrice', value: number): void {
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? numeric : 0;

    this.lines.set(this.lines().map(line => {
      if (line.productId !== productId) return line;

      return field === 'quantity'
        ? { ...line, quantity: Math.max(1, Math.trunc(safeValue)) }
        : { ...line, purchasePrice: Math.max(0, safeValue) };
    }));
  }

  removeLine(productId: number): void {
    this.lines.set(this.lines().filter(line => line.productId !== productId));
  }

  savePurchase(): void {
    this.clearMessages();

    if (!this.form.supplierId) {
      this.errorMessage.set('Selecciona un proveedor.');
      return;
    }

    const sectionId = this.posService.selectedSectionId();
    if (!sectionId) {
      this.errorMessage.set('Selecciona una unidad de negocio en la barra superior.');
      return;
    }

    const lines = this.lines();
    if (lines.length === 0) {
      this.errorMessage.set('Agrega al menos un producto a la compra.');
      return;
    }

    const purchase: CreatePurchaseDto = {
      userId: 1,
      supplierId: Number(this.form.supplierId),
      invoiceNumber: this.form.invoiceNumber.trim() || undefined,
      sectionId,
      observations: this.form.observations.trim() || undefined,
      details: lines.map(line => ({ productId: line.productId, quantity: line.quantity, purchasePrice: line.purchasePrice }))
    };

    this.saving.set(true);
    this.purchasesService.createPurchase(purchase).subscribe({
      next: response => {
        this.saving.set(false);
        this.successMessage.set(response.message);
        this.lines.set([]);
        this.newLine = this.emptyLine();
        this.form = this.emptyForm();
        this.form.sectionId = this.posService.selectedSectionId();
        this.activeTab.set('list');
        this.loadPurchases();
      },
      error: error => {
        this.saving.set(false);
        this.showError(error);
      }
    });
  }

  resetForm(): void {
    this.lines.set([]);
    this.newLine = this.emptyLine();
    this.form = this.emptyForm();
    this.form.sectionId = this.posService.selectedSectionId();
    this.clearMessages();
  }

  private emptyForm(): { supplierId: number; invoiceNumber: string; sectionId: number | null; observations: string } {
    return { supplierId: 0, invoiceNumber: '', sectionId: null, observations: '' };
  }

  private emptyLine(): { productId: number; quantity: number; purchasePrice: number } {
    return { productId: 0, quantity: 1, purchasePrice: 0 };
  }

  private showError(error: any): void {
    this.errorMessage.set(error?.error?.message || 'No fue posible completar la operación.');
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.infoMessage.set('');
  }
}
