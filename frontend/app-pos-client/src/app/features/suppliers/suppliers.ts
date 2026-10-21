import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Supplier } from '../../shared/models/pos.models';
import { SupplierFormModalComponent } from './supplier-form-modal';
import { SuppliersService } from './services/suppliers.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, SupplierFormModalComponent],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Proveedores</p>
          <h2 class="text-2xl font-black text-slate-900">Gestión de proveedores</h2>
          <p class="text-sm text-slate-500">Administra los proveedores usados en las compras de mercadería.</p>
        </div>
        <button (click)="openCreate()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Nuevo proveedor</button>
      </header>

      <div class="flex gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input [ngModel]="search()" (ngModelChange)="search.set($event)" type="search" placeholder="Buscar por nombre, teléfono, correo o dirección" class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button (click)="loadSuppliers()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Actualizar</button>
      </div>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div>
      }

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
          {{ filteredSuppliers().length }} de {{ suppliers().length }} proveedores
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Teléfono</th>
                <th class="px-4 py-3">Correo</th>
                <th class="px-4 py-3">Dirección</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (supplier of filteredSuppliers(); track supplier.supplierId) {
                <tr>
                  <td class="px-4 py-3 font-mono text-xs text-slate-500">#{{ supplier.supplierId }}</td>
                  <td class="px-4 py-3 font-bold text-slate-800">{{ supplier.name }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ supplier.phone || '-' }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ supplier.email || '-' }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ supplier.address || '-' }}</td>
                  <td class="px-4 py-3 text-right"><button (click)="openEdit(supplier)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Editar</button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-12 text-center text-sm text-slate-400">{{ suppliers().length ? 'No hay proveedores para la búsqueda.' : 'Aún no hay proveedores registrados.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (modalOpen()) {
        <app-supplier-form-modal [supplier]="editingSupplier()" (saved)="onSaved($event)" (closed)="closeModal()" />
      }
    </section>
  `
})
export class SuppliersComponent {
  private readonly suppliersService = inject(SuppliersService);

  suppliers = signal<Supplier[]>([]);
  search = signal('');
  modalOpen = signal(false);
  editingSupplier = signal<Supplier | null>(null);
  errorMessage = signal('');
  successMessage = signal('');

  filteredSuppliers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.suppliers();

    return this.suppliers().filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      (supplier.phone || '').toLowerCase().includes(term) ||
      (supplier.email || '').toLowerCase().includes(term) ||
      (supplier.address || '').toLowerCase().includes(term)
    );
  });

  constructor() {
    this.loadSuppliers();
  }

  loadSuppliers(): void {
    this.errorMessage.set('');

    this.suppliersService.getSuppliers().subscribe({
      next: suppliers => this.suppliers.set(suppliers),
      error: error => this.showError(error, 'No fue posible cargar los proveedores.')
    });
  }

  openCreate(): void {
    this.editingSupplier.set(null);
    this.modalOpen.set(true);
    this.clearMessages();
  }

  openEdit(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.modalOpen.set(true);
    this.clearMessages();
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingSupplier.set(null);
  }

  onSaved(_supplier: Supplier): void {
    this.closeModal();
    this.successMessage.set('Proveedor guardado correctamente.');
    this.loadSuppliers();
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private showError(error: any, fallback: string): void {
    this.errorMessage.set(error?.error?.message || fallback);
  }
}
