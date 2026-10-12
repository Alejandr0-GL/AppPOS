import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Inventory as InventoryRecord, StockMovement } from '../../shared/models/pos.models';
import { PosService } from '../pos/services/pos.service';

interface InventoryDraft {
  currentStock: number;
  minStock: number;
  reason: string;
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">INV-06</p>
          <h2 class="text-2xl font-black text-slate-900">Inventario y stock</h2>
          <p class="text-sm text-slate-500">Gestiona existencias y mínimos de la unidad activa.</p>
        </div>
        <button (click)="reload()" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Actualizar</button>
      </header>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div>
      }

      <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span class="text-sm font-bold text-slate-700">{{ inventories().length }} productos con inventario</span>
            <span class="text-xs font-semibold text-slate-400">Unidad: {{ inventories()[0]?.section?.name || 'Cargando...' }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr><th class="px-4 py-3">SKU</th><th class="px-4 py-3">Nombre del producto</th><th class="px-4 py-3">Categoría</th><th class="px-4 py-3">Stock actual</th><th class="px-4 py-3">Stock mínimo</th><th class="px-4 py-3">Estado</th><th class="px-4 py-3 text-right">Acción</th></tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of inventories(); track item.inventoryId) {
                  <tr [class.bg-amber-50]="item.currentStock <= item.minStock">
                    <td class="px-4 py-3 font-mono text-xs font-bold text-slate-600">{{ item.product.sku }}</td>
                    <td class="px-4 py-3 font-bold text-slate-800">{{ item.product.name }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ item.product.category?.name || 'Sin categoría' }}</td>
                    <td class="px-4 py-3 font-bold text-slate-800">{{ item.currentStock }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ item.minStock }}</td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-red-100]="item.currentStock <= item.minStock" [class.text-red-700]="item.currentStock <= item.minStock" [class.bg-emerald-100]="item.currentStock > item.minStock" [class.text-emerald-700]="item.currentStock > item.minStock">{{ item.currentStock <= item.minStock ? 'Reponer' : 'Normal' }}</span></td>
                    <td class="px-4 py-3 text-right"><button (click)="openDetails(item)" class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Ver Kardex</button></td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="px-4 py-12 text-center text-sm text-slate-400">No hay inventarios para la unidad activa.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>

      @if (selectedInventory(); as item) {
        <div class="fixed inset-0 z-40 bg-slate-950/40" (click)="closeDetails()"></div>
        <aside class="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" aria-label="Detalle de inventario">
          <div class="flex items-start justify-between border-b border-slate-200 p-5">
            <div><p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Kardex de producto</p><h3 class="text-xl font-black text-slate-900">{{ item.product.name }}</h3><p class="text-sm text-slate-500">SKU: {{ item.product.sku }} · {{ item.product.category?.name || 'Sin categoría' }}</p></div>
            <button (click)="closeDetails()" class="rounded-md px-2 py-1 text-xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar detalle">&times;</button>
          </div>
          <div class="grid grid-cols-2 gap-3 border-b border-slate-200 p-5"><div class="rounded-xl bg-slate-100 p-3"><span class="block text-xs uppercase text-slate-500">Stock actual</span><strong class="text-2xl text-slate-900">{{ item.currentStock }}</strong></div><div class="rounded-xl bg-amber-50 p-3"><span class="block text-xs uppercase text-amber-700">Stock mínimo</span><strong class="text-2xl text-amber-900">{{ item.minStock }}</strong></div></div>
          <div class="border-b border-slate-200 p-5"><h4 class="mb-3 font-bold text-slate-800">Ajuste rápido</h4><div class="grid grid-cols-2 gap-3"><label class="text-xs font-bold uppercase text-slate-500">Stock actual<input [(ngModel)]="drafts[item.inventoryId].currentStock" type="number" min="0" class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" /></label><label class="text-xs font-bold uppercase text-slate-500">Stock mínimo<input [(ngModel)]="drafts[item.inventoryId].minStock" type="number" min="0" class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" /></label></div><label class="mt-3 block text-xs font-bold uppercase text-slate-500">Motivo<input [(ngModel)]="drafts[item.inventoryId].reason" type="text" placeholder="Conteo físico - producto dañado" class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" /></label><button (click)="save(item)" class="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Guardar ajuste</button></div>
          <div class="p-5"><h4 class="mb-3 font-bold text-slate-800">Movimientos</h4><div class="overflow-x-auto"><table class="w-full min-w-[520px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">Fecha / hora</th><th class="px-3 py-2">Tipo</th><th class="px-3 py-2">Cantidad</th><th class="px-3 py-2">Usuario</th><th class="px-3 py-2">Motivo</th></tr></thead><tbody class="divide-y divide-slate-100">@for (movement of movements(); track movement.movementId) {<tr><td class="whitespace-nowrap px-3 py-2 text-slate-600">{{ movement.createdAt | date:'dd/MM/yyyy HH:mm' }}</td><td class="px-3 py-2 font-semibold text-slate-700">{{ movement.movementType }}</td><td class="px-3 py-2 font-bold" [class.text-emerald-600]="movement.quantity > 0" [class.text-red-600]="movement.quantity < 0">{{ movement.quantity > 0 ? '+' : '' }}{{ movement.quantity }}</td><td class="px-3 py-2 text-slate-600">{{ movement.user?.username || 'Usuario' }}</td><td class="px-3 py-2 text-slate-600">{{ movement.reason || 'Sin nota' }}</td></tr>} @empty {<tr><td colspan="5" class="px-3 py-8 text-center text-slate-400">No hay movimientos para este producto.</td></tr>}</tbody></table></div></div>
        </aside>
      }
    </section>
  `
})
export class InventoryComponent {
  private readonly posService = inject(PosService);

  inventories = signal<InventoryRecord[]>([]);
  movements = signal<StockMovement[]>([]);
  selectedInventory = signal<InventoryRecord | null>(null);
  drafts: Record<number, InventoryDraft> = {};
  errorMessage = signal('');
  successMessage = signal('');

  private readonly sectionEffect = effect(() => {
    const sectionId = this.posService.selectedSectionId();
    if (sectionId) {
      this.selectedInventory.set(null);
      this.load(sectionId);
    }
  });

  reload(): void {
    const sectionId = this.posService.selectedSectionId();
    if (sectionId) this.load(sectionId);
  }

  private load(sectionId: number): void {
    this.errorMessage.set('');
    this.posService.getInventories(sectionId).subscribe({
      next: inventories => {
        this.inventories.set(inventories);
        this.drafts = Object.fromEntries(inventories.map(item => [item.inventoryId, {
          currentStock: item.currentStock,
          minStock: item.minStock,
          reason: 'Ajuste manual de inventario'
        }]));
      },
      error: error => this.errorMessage.set(error.error?.message || 'No fue posible cargar el inventario.')
    });
  }

  openDetails(item: InventoryRecord): void {
    this.selectedInventory.set(item);
    this.movements.set([]);
    this.posService.getStockMovements(item.sectionId, item.productId).subscribe({
      next: movements => this.movements.set(movements),
      error: () => this.errorMessage.set('No fue posible cargar el Kardex del producto.')
    });
  }

  closeDetails(): void {
    this.selectedInventory.set(null);
    this.movements.set([]);
  }

  save(item: InventoryRecord): void {
    const draft = this.drafts[item.inventoryId];
    if (!draft || draft.currentStock < 0 || draft.minStock < 0) {
      this.errorMessage.set('El stock actual y el stock mínimo no pueden ser negativos.');
      return;
    }

    this.posService.updateInventory(item.inventoryId, {
      userId: 1,
      sectionId: item.sectionId,
      currentStock: draft.currentStock,
      minStock: draft.minStock,
      reason: draft.reason
    }).subscribe({
      next: response => {
        this.successMessage.set(response.message);
        this.selectedInventory.set(null);
        this.load(item.sectionId);
      },
      error: error => this.errorMessage.set(error.error?.message || 'No fue posible guardar el inventario.')
    });
  }
}
