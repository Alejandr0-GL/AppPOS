import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Supplier } from '../../shared/models/pos.models';
import { SuppliersService } from './services/suppliers.service';

interface SupplierForm {
  name: string;
  phone: string;
  email: string;
  address: string;
}

@Component({
  selector: 'app-supplier-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-950/50" (click)="close()"></div>
    <section class="fixed inset-4 z-[60] m-auto max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" aria-label="Formulario de proveedor">
      <div class="flex items-start justify-between border-b border-slate-200 pb-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Proveedor</p>
          <h3 class="text-xl font-black text-slate-900">{{ supplier() ? 'Editar proveedor' : 'Nuevo proveedor' }}</h3>
        </div>
        <button (click)="close()" class="rounded-md px-3 py-1 text-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">&times;</button>
      </div>

      @if (errorMessage()) {
        <div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }

      <div class="grid gap-3 py-5 md:grid-cols-2">
        <label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">Nombre *
          <input [(ngModel)]="form.name" maxlength="50" placeholder="Razón social o nombre" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase text-slate-500">Teléfono
          <input [(ngModel)]="form.phone" maxlength="20" placeholder="Ej. 300 000 0000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase text-slate-500">Correo
          <input [(ngModel)]="form.email" type="email" maxlength="100" placeholder="proveedor@correo.com" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
        <label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">Dirección
          <input [(ngModel)]="form.address" maxlength="200" placeholder="Dirección del proveedor" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
        </label>
      </div>

      <div class="flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button (click)="close()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancelar</button>
        <button (click)="save()" [disabled]="saving()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Guardando...' : 'Guardar proveedor' }}</button>
      </div>
    </section>
  `
})
export class SupplierFormModalComponent implements OnInit {
  private readonly suppliersService = inject(SuppliersService);

  supplier = input<Supplier | null>(null);
  saved = output<Supplier>();
  closed = output<void>();

  form: SupplierForm = this.emptyForm();
  errorMessage = signal('');
  saving = signal(false);

  ngOnInit(): void {
    const supplier = this.supplier();
    if (!supplier) return;

    this.form = {
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || ''
    };
  }

  save(): void {
    this.errorMessage.set('');

    const name = this.form.name.trim();
    const phone = this.form.phone.trim();
    const email = this.form.email.trim();
    const address = this.form.address.trim();

    if (!name) {
      this.errorMessage.set('El nombre del proveedor es obligatorio.');
      return;
    }

    if (name.length > 50) {
      this.errorMessage.set('El nombre no puede superar 50 caracteres.');
      return;
    }

    if (phone.length > 20 || email.length > 100 || address.length > 200) {
      this.errorMessage.set('Revisa la longitud de teléfono, correo y dirección.');
      return;
    }

    const payload = {
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined
    };

    const current = this.supplier();
    this.saving.set(true);

    if (current) {
      this.suppliersService.updateSupplier({ supplierId: current.supplierId, ...payload }).subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit({ supplierId: current.supplierId, ...payload });
        },
        error: error => {
          this.saving.set(false);
          this.showError(error);
        }
      });
      return;
    }

    this.suppliersService.createSupplier(payload).subscribe({
      next: supplier => {
        this.saving.set(false);
        this.saved.emit(supplier);
      },
      error: error => {
        this.saving.set(false);
        this.showError(error);
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  private emptyForm(): SupplierForm {
    return { name: '', phone: '', email: '', address: '' };
  }

  private showError(error: any): void {
    this.errorMessage.set(error?.error?.message || 'No fue posible guardar el proveedor.');
  }
}
