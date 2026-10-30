import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee, EmployeeCommissionReport } from '../../shared/models/pos.models';
import { EmployeesService } from './services/employees.service';

interface EmployeeForm {
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">PROD-02 / POS-04</p>
          <h2 class="text-2xl font-black text-slate-900">Empleados y comisiones</h2>
          <p class="text-sm text-slate-500">Gestiona al personal y liquida las comisiones por servicios prestados.</p>
        </div>
        @if (activeTab() === 'staff') {
          <button (click)="openCreate()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Nuevo empleado</button>
        }
      </header>

      <div class="flex gap-1 rounded-xl bg-slate-200/70 p-1 text-sm font-bold">
        <button (click)="activeTab.set('staff')" [class.bg-white]="activeTab() === 'staff'" [class.shadow-sm]="activeTab() === 'staff'" [class.text-indigo-700]="activeTab() === 'staff'" class="flex-1 rounded-lg px-4 py-2 text-slate-600">Gestión de Personal</button>
        <button (click)="activeTab.set('commissions')" [class.bg-white]="activeTab() === 'commissions'" [class.shadow-sm]="activeTab() === 'commissions'" [class.text-indigo-700]="activeTab() === 'commissions'" class="flex-1 rounded-lg px-4 py-2 text-slate-600">Liquidación de Comisiones / Sueldos</button>
      </div>

      @if (errorMessage()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div>
      }

      @if (activeTab() === 'staff') {
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{{ employees().length }} empleados / técnicos</div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Nombre</th>
                  <th class="px-4 py-3">Teléfono</th>
                  <th class="px-4 py-3">Cargo / Rol</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (employee of employees(); track employee.employeeId) {
                  <tr>
                    <td class="px-4 py-3 font-mono text-xs text-slate-500">#{{ employee.employeeId }}</td>
                    <td class="px-4 py-3 font-bold text-slate-800">{{ employee.name }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ employee.phone || '-' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ employee.role || '-' }}</td>
                    <td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="employee.isActive" [class.text-emerald-700]="employee.isActive" [class.bg-slate-200]="!employee.isActive" [class.text-slate-600]="!employee.isActive">{{ employee.isActive ? 'Activo' : 'Inactivo' }}</span></td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex justify-end gap-2">
                        <button (click)="openEdit(employee)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Editar</button>
                        @if (employee.isActive) {
                          <button (click)="deactivate(employee)" class="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700">Desactivar</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="px-4 py-12 text-center text-sm text-slate-400">Aún no hay empleados registrados.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (activeTab() === 'commissions') {
        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Desde
            <input #commissionStartInput type="date" [value]="startDate" (change)="onStartDateChange(commissionStartInput.value, commissionStartInput)" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Hasta
            <input #commissionEndInput type="date" [value]="endDate" (change)="onEndDateChange(commissionEndInput.value, commissionEndInput)" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500">Empleado
            <select [ngModel]="selectedEmployeeId()" (ngModelChange)="onEmployeeChange($event)" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
              <option [ngValue]="null">Seleccionar empleado</option>
              @for (employee of employees(); track employee.employeeId) {
                <option [ngValue]="employee.employeeId">{{ employee.name }}{{ employee.isActive ? '' : ' (inactivo)' }}</option>
              }
            </select>
          </label>
          <button (click)="loadCommissions()" [disabled]="reportLoading() || !selectedEmployeeId()" class="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{{ reportLoading() ? 'Consultando...' : 'Actualizar' }}</button>
        </div>

        @if (reportError()) {
          <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ reportError() }}</div>
        }

        @if (!selectedEmployeeId()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">Selecciona un empleado para consultar su liquidación.</div>
        } @else if (report(); as data) {
          <div class="grid gap-3 sm:grid-cols-3">
            <article class="rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white p-5 shadow-sm">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Empleado</p>
              <p class="mt-2 text-xl font-black text-slate-900">{{ data.employeeName }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ data.startDate | date:'dd/MM/yyyy' }} al {{ data.endDate | date:'dd/MM/yyyy' }}</p>
            </article>
            <article class="rounded-2xl border border-slate-200 border-l-4 border-l-sky-500 bg-white p-5 shadow-sm">
              <p class="text-xs font-bold uppercase tracking-wider text-slate-500">Total ventas</p>
              <p class="mt-2 text-3xl font-black text-slate-900">{{ data.totalSales | currency:'COP':'symbol':'1.0-0' }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ data.items.length }} ítems liquidados.</p>
            </article>
            <article class="rounded-2xl border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 p-5 shadow-sm">
              <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">Total a Liquidar / Pagar</p>
              <p class="mt-2 text-3xl font-black text-emerald-700">{{ data.totalCommission | currency:'COP':'symbol':'1.0-0' }}</p>
              <p class="mt-1 text-xs text-emerald-600">Comisión calculada sobre los servicios del período.</p>
            </article>
          </div>

          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Servicios prestados en el período</div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[960px] text-left text-sm">
                <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th class="px-4 py-3">Fecha</th>
                    <th class="px-4 py-3">Ítem / Servicio</th>
                    <th class="px-4 py-3">SKU</th>
                    <th class="px-4 py-3">Cliente</th>
                    <th class="px-4 py-3 text-right">Venta Total</th>
                    <th class="px-4 py-3 text-right">% Comisión</th>
                    <th class="px-4 py-3 text-right">Monto Comisión</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of data.items; track item.orderDetailId) {
                    <tr>
                      <td class="px-4 py-3 text-slate-600">{{ item.date | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="px-4 py-3 font-bold text-slate-800">{{ item.itemName }} @if (item.isService) { <span class="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">Servicio</span> }</td>
                      <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ item.sku }}</td>
                      <td class="px-4 py-3 text-slate-600">{{ item.customerName }}</td>
                      <td class="px-4 py-3 text-right text-slate-700">{{ item.totalSale | currency:'COP':'symbol':'1.0-0' }}</td>
                      <td class="px-4 py-3 text-right text-slate-700">{{ item.commissionPercentage }}%</td>
                      <td class="px-4 py-3 text-right font-bold text-emerald-700">{{ item.commissionAmount | currency:'COP':'symbol':'1.0-0' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="px-4 py-12 text-center text-sm text-slate-400">No hay servicios prestados en el período seleccionado.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeModal()"></div>
      <section class="fixed inset-4 z-50 m-auto max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" aria-label="Formulario de empleado">
        <div class="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">Empleado</p>
            <h3 class="text-xl font-black text-slate-900">{{ editingEmployee() ? 'Editar empleado' : 'Nuevo empleado' }}</h3>
          </div>
          <button (click)="closeModal()" class="rounded-md px-3 py-1 text-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">&times;</button>
        </div>

        <div class="grid gap-3 py-5 md:grid-cols-2">
          <label class="text-xs font-bold uppercase text-slate-500 md:col-span-2">Nombre *
            <input [(ngModel)]="form.name" maxlength="100" placeholder="Nombre completo" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="text-xs font-bold uppercase text-slate-500">Teléfono
            <input [(ngModel)]="form.phone" maxlength="20" placeholder="Ej. 300 000 0000" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <label class="text-xs font-bold uppercase text-slate-500">Rol / Cargo
            <input [(ngModel)]="form.role" maxlength="50" placeholder="Ej. Técnico, Mecánico" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          @if (editingEmployee()) {
            <label class="flex items-end gap-2 pb-2 text-xs font-bold uppercase text-slate-500">
              <input type="checkbox" [(ngModel)]="form.isActive" class="h-4 w-4 rounded border-slate-300" />
              Empleado activo
            </label>
          }
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button (click)="closeModal()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">Cancelar</button>
          <button (click)="save()" [disabled]="saving()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Guardando...' : 'Guardar empleado' }}</button>
        </div>
      </section>
    }
  `
})
export class EmployeesComponent {
  private readonly employeesService = inject(EmployeesService);

  employees = signal<Employee[]>([]);
  activeTab = signal<'staff' | 'commissions'>('staff');

  modalOpen = signal(false);
  editingEmployee = signal<Employee | null>(null);
  form: EmployeeForm = this.emptyForm();
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  selectedEmployeeId = signal<number | null>(null);
  startDate = '';
  endDate = '';
  report = signal<EmployeeCommissionReport | null>(null);
  reportLoading = signal(false);
  reportError = signal('');

  constructor() {
    this.setDefaultRange();
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.employeesService.getEmployees(true).subscribe({
      next: employees => {
        this.employees.set(employees);

        if (this.selectedEmployeeId() === null) {
          const firstActive = employees.find(employee => employee.isActive);
          if (firstActive) {
            this.selectedEmployeeId.set(firstActive.employeeId);
            this.loadCommissions();
          }
        }
      },
      error: error => this.showError(error, 'No fue posible cargar los empleados.')
    });
  }

  openCreate(): void {
    this.editingEmployee.set(null);
    this.form = this.emptyForm();
    this.modalOpen.set(true);
    this.clearMessages();
  }

  openEdit(employee: Employee): void {
    this.editingEmployee.set(employee);
    this.form = {
      name: employee.name,
      phone: employee.phone || '',
      role: employee.role || '',
      isActive: employee.isActive
    };
    this.modalOpen.set(true);
    this.clearMessages();
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingEmployee.set(null);
  }

  save(): void {
    this.clearMessages();

    if (!this.form.name.trim()) {
      this.errorMessage.set('El nombre del empleado es obligatorio.');
      return;
    }

    const payload = {
      name: this.form.name.trim(),
      phone: this.form.phone.trim() || null,
      role: this.form.role.trim() || null
    };

    this.saving.set(true);
    const current = this.editingEmployee();

    if (current) {
      this.employeesService.updateEmployee({
        ...payload,
        employeeId: current.employeeId,
        isActive: this.form.isActive
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.successMessage.set('Empleado actualizado correctamente.');
          this.loadEmployees();
        },
        error: error => {
          this.saving.set(false);
          this.showError(error, 'No fue posible actualizar el empleado.');
        }
      });
      return;
    }

    this.employeesService.createEmployee(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.successMessage.set('Empleado creado correctamente.');
        this.loadEmployees();
      },
      error: error => {
        this.saving.set(false);
        this.showError(error, 'No fue posible crear el empleado.');
      }
    });
  }

  deactivate(employee: Employee): void {
    if (!confirm(`¿Deseas desactivar a ${employee.name}?`)) return;

    this.clearMessages();
    this.employeesService.deleteEmployee(employee.employeeId).subscribe({
      next: response => {
        this.successMessage.set(response.message);
        this.loadEmployees();
      },
      error: error => this.showError(error, 'No fue posible desactivar el empleado.')
    });
  }

  onEmployeeChange(employeeId: number | null): void {
    this.selectedEmployeeId.set(employeeId);
    this.loadCommissions();
  }

  onStartDateChange(value: string, input: HTMLInputElement): void {
    if (!this.validateRange(value, this.endDate)) {
      input.value = this.startDate;
      return;
    }

    this.startDate = value;
    this.loadCommissions();
  }

  onEndDateChange(value: string, input: HTMLInputElement): void {
    if (!this.validateRange(this.startDate, value)) {
      input.value = this.endDate;
      return;
    }

    this.endDate = value;
    this.loadCommissions();
  }

  loadCommissions(): void {
    const employeeId = this.selectedEmployeeId();
    if (!employeeId) {
      this.report.set(null);
      return;
    }

    this.reportLoading.set(true);
    this.reportError.set('');

    this.employeesService
      .getCommissions(employeeId, this.startDate || undefined, this.endDate || undefined)
      .subscribe({
        next: report => {
          this.report.set(report);
          this.reportLoading.set(false);
        },
        error: error => {
          this.reportLoading.set(false);
          this.reportError.set(error?.error?.message || 'No fue posible cargar la liquidación.');
        }
      });
  }

  private validateRange(startDate: string, endDate: string): boolean {
    this.reportError.set('');

    if (!startDate || !endDate) {
      this.reportError.set('Selecciona la fecha inicial y la final.');
      return false;
    }

    if (startDate > endDate) {
      this.reportError.set('La fecha inicial no puede ser mayor que la final.');
      return false;
    }

    return true;
  }

  private setDefaultRange(): void {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 29);

    this.endDate = this.toIsoDate(end);
    this.startDate = this.toIsoDate(start);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private emptyForm(): EmployeeForm {
    return { name: '', phone: '', role: '', isActive: true };
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private showError(error: any, fallback: string): void {
    this.errorMessage.set(error?.error?.message || fallback);
  }
}
