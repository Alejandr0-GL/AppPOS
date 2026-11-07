import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, ROLE_LABELS, UserRole } from '../../core/auth/auth.service';
import { PosService, Section } from '../pos/services/pos.service';
import { AppUser, UsersService } from './services/users.service';

/** Mínimo de la API (UserRules.MinPasswordLength). */
export const MIN_PASSWORD_LENGTH = 8;

interface UserForm {
  username: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  sectionId: number | null;
  isActive: boolean;
}

/**
 * SEC-01: administración de usuarios (sólo administrador). Crear cajeros y administradores,
 * cambiar rol / unidad, desactivar y restablecer contraseñas (también desbloquea).
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-indigo-600">SEC-01</p>
          <h2 class="text-2xl font-black text-slate-900">Usuarios</h2>
          <p class="text-sm text-slate-500">Quién puede entrar al sistema y qué puede hacer.</p>
        </div>
        <button (click)="openCreate()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Nuevo usuario</button>
      </header>

      <div class="grid gap-3 text-sm md:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="font-bold text-slate-800">Administrador</p>
          <p class="text-slate-500">Todo, en todas las unidades: ventas, anulaciones, productos, inventario, compras, gastos, empleados, dashboard y usuarios.</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="font-bold text-slate-800">Cajero</p>
          <p class="text-slate-500">Sólo en su unidad: vender (cambiar un precio exige motivo), ver el historial, reimprimir, cobrar créditos, consultar stock y gestionar clientes. No anula ni ve ganancias ni gastos.</p>
        </div>
      </div>

      @if (errorMessage()) {
        <div role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div>
      }

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">{{ users().length }} usuarios</div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Usuario</th>
                <th class="px-4 py-3">Nombre</th>
                <th class="px-4 py-3">Rol</th>
                <th class="px-4 py-3">Unidad</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3">Último acceso</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (user of users(); track user.userId) {
                <tr [class.opacity-60]="!user.isActive">
                  <td class="px-4 py-3 font-mono text-xs font-bold text-slate-800">{{ user.username }}
                    @if (user.userId === currentUserId()) { <span class="ml-1 rounded-full bg-indigo-100 px-2 py-0.5 font-sans text-[10px] font-bold uppercase text-indigo-700">Tú</span> }
                  </td>
                  <td class="px-4 py-3 text-slate-700">{{ user.fullName || '-' }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded-full px-2 py-1 text-xs font-bold" [ngClass]="user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'">{{ roleLabel(user.role) }}</span>
                  </td>
                  <td class="px-4 py-3 text-slate-600">{{ user.role === 'ADMIN' ? 'Todas' : (user.sectionName || '-') }}</td>
                  <td class="px-4 py-3">
                    @if (!user.isActive) {
                      <span class="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600">Inactivo</span>
                    } @else if (user.isLocked) {
                      <span class="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700" title="Bloqueado por intentos fallidos">Bloqueado hasta {{ user.lockoutUntil | date:'HH:mm' }}</span>
                    } @else {
                      <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Activo</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-slate-600">{{ user.lastAccess ? (user.lastAccess | date:'dd/MM/yyyy HH:mm') : 'Nunca' }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-2">
                      <button (click)="openEdit(user)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-600">Editar</button>
                      <button (click)="openPassword(user)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-600">{{ user.isLocked ? 'Desbloquear / contraseña' : 'Cambiar contraseña' }}</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-12 text-center text-sm text-slate-400">{{ loading() ? 'Cargando…' : 'No hay usuarios.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>

    @if (formOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" (click)="closeForm()">
        <form (ngSubmit)="save()" (click)="$event.stopPropagation()" class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <h3 class="text-lg font-black text-slate-900">{{ editingId() ? 'Editar usuario' : 'Nuevo usuario' }}</h3>

          @if (formError()) {
            <div role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError() }}</div>
          }

          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Usuario
            @if (editingId()) {
              <p class="mt-1 font-mono text-sm normal-case tracking-normal text-slate-800">{{ form.username }}</p>
            } @else {
              <input name="username" [(ngModel)]="form.username" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="ej. juan.perez"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm font-normal normal-case tracking-normal text-slate-800" />
              <span class="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">3 a 20 caracteres: minúsculas, números, punto, guion o guion bajo.</span>
            }
          </label>

          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre (opcional)
            <input name="fullName" [(ngModel)]="form.fullName" maxlength="100" placeholder="Se muestra en la barra superior"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800" />
          </label>

          <div>
            <span class="block text-xs font-bold uppercase tracking-wider text-slate-500">Rol</span>
            <div class="mt-1 grid grid-cols-2 gap-2">
              @for (role of roles; track role) {
                <button type="button" (click)="setRole(role)" [attr.aria-pressed]="form.role === role" [disabled]="isSelf()"
                  class="rounded-lg border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  [ngClass]="form.role === role ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400'">
                  {{ roleLabel(role) }}
                </button>
              }
            </div>
          </div>

          @if (form.role === 'CASHIER') {
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Unidad de negocio
              <select name="sectionId" [(ngModel)]="form.sectionId" class="select-chevron mt-1 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-7 text-sm font-normal normal-case tracking-normal text-slate-800">
                <option [ngValue]="null">Seleccionar unidad</option>
                @for (section of sections(); track section.sectionId) {
                  <option [ngValue]="section.sectionId">{{ section.name }}</option>
                }
              </select>
              <span class="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">El cajero sólo vende y consulta en esta unidad.</span>
            </label>
          } @else {
            <p class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">El administrador trabaja en todas las unidades.</p>
          }

          @if (!editingId()) {
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña
              <input name="password" type="password" [(ngModel)]="form.password" autocomplete="new-password"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
              <span class="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">Mínimo {{ minPasswordLength }} caracteres.</span>
            </label>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar contraseña
              <input name="confirmPassword" type="password" [(ngModel)]="form.confirmPassword" autocomplete="new-password"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
            </label>
          } @else {
            <label class="flex items-center gap-2 text-sm font-medium text-slate-700" [class.opacity-60]="isSelf()">
              <input name="isActive" type="checkbox" [(ngModel)]="form.isActive" [disabled]="isSelf()" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Usuario activo (puede iniciar sesión)
            </label>
            @if (isSelf()) {
              <p class="text-xs text-slate-400">No puedes quitarte el rol de administrador ni desactivarte a ti mismo.</p>
            }
          }

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="closeForm()" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" [disabled]="saving()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Guardando…' : (editingId() ? 'Guardar cambios' : 'Crear usuario') }}</button>
          </div>
        </form>
      </div>
    }

    @if (passwordUser(); as target) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" (click)="closePassword()">
        <form (ngSubmit)="savePassword()" (click)="$event.stopPropagation()" class="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div>
            <h3 class="text-lg font-black text-slate-900">Cambiar contraseña</h3>
            <p class="text-sm text-slate-500">Usuario <strong class="font-mono">{{ target.username }}</strong>. Se cierran sus sesiones abiertas y, si estaba bloqueado, se desbloquea.</p>
          </div>

          @if (formError()) {
            <div role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError() }}</div>
          }

          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña nueva
            <input name="newPassword" type="password" [(ngModel)]="newPassword" autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
            <span class="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">Mínimo {{ minPasswordLength }} caracteres.</span>
          </label>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Confirmar contraseña
            <input name="confirmNewPassword" type="password" [(ngModel)]="confirmNewPassword" autocomplete="new-password"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800" />
          </label>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" (click)="closePassword()" class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="submit" [disabled]="saving()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{{ saving() ? 'Guardando…' : 'Guardar contraseña' }}</button>
          </div>
        </form>
      </div>
    }
  `
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly posService = inject(PosService);
  private readonly auth = inject(AuthService);

  readonly roles: UserRole[] = ['CASHIER', 'ADMIN'];
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  readonly users = signal<AppUser[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly formError = signal('');

  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly passwordUser = signal<AppUser | null>(null);
  form: UserForm = this.emptyForm();
  newPassword = '';
  confirmNewPassword = '';

  readonly currentUserId = () => this.auth.user()?.userId ?? null;
  readonly isSelf = () => this.editingId() !== null && this.editingId() === this.currentUserId();

  ngOnInit(): void {
    this.loadUsers();
    this.posService.getSections().subscribe({ next: sections => this.sections.set(sections) });
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role] ?? role;
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'No fue posible cargar los usuarios.');
      }
    });
  }

  openCreate(): void {
    this.clearMessages();
    this.editingId.set(null);
    this.form = this.emptyForm();
    // Por ahora los cajeros trabajan en una sola unidad: se sugiere la primera.
    this.form.sectionId = this.sections()[0]?.sectionId ?? null;
    this.formOpen.set(true);
  }

  openEdit(user: AppUser): void {
    this.clearMessages();
    this.editingId.set(user.userId);
    this.form = {
      username: user.username,
      fullName: user.fullName ?? '',
      password: '',
      confirmPassword: '',
      role: user.role,
      sectionId: user.sectionId ?? this.sections()[0]?.sectionId ?? null,
      isActive: user.isActive
    };
    this.formOpen.set(true);
  }

  setRole(role: UserRole): void {
    this.form.role = role;
  }

  closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.formError.set('');
  }

  save(): void {
    this.formError.set('');
    const editingId = this.editingId();
    const fullName = this.form.fullName.trim() || null;
    const sectionId = this.form.role === 'CASHIER' ? this.form.sectionId : null;

    if (this.form.role === 'CASHIER' && !sectionId) {
      this.formError.set('Selecciona la unidad de negocio del cajero.');
      return;
    }

    if (editingId === null) {
      const username = this.form.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
        this.formError.set('El usuario debe tener de 3 a 20 caracteres: minúsculas sin tildes, números, punto, guion o guion bajo.');
        return;
      }
      const passwordError = this.passwordError(this.form.password, this.form.confirmPassword);
      if (passwordError) {
        this.formError.set(passwordError);
        return;
      }

      this.saving.set(true);
      this.usersService.createUser({ username, fullName, password: this.form.password, role: this.form.role, sectionId }).subscribe({
        next: response => this.afterSave(response.message),
        error: error => this.onFormError(error, 'No fue posible crear el usuario.')
      });
      return;
    }

    this.saving.set(true);
    this.usersService.updateUser(editingId, { fullName, role: this.form.role, sectionId, isActive: this.form.isActive }).subscribe({
      next: response => this.afterSave(response.message),
      error: error => this.onFormError(error, 'No fue posible actualizar el usuario.')
    });
  }

  openPassword(user: AppUser): void {
    this.clearMessages();
    this.formError.set('');
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.passwordUser.set(user);
  }

  closePassword(): void {
    if (this.saving()) return;
    this.passwordUser.set(null);
    this.formError.set('');
  }

  savePassword(): void {
    const user = this.passwordUser();
    if (!user) return;
    const error = this.passwordError(this.newPassword, this.confirmNewPassword);
    if (error) {
      this.formError.set(error);
      return;
    }

    const isSelf = user.userId === this.currentUserId();
    this.saving.set(true);
    this.usersService.resetPassword(user.userId, this.newPassword).subscribe({
      next: response => {
        this.saving.set(false);
        this.passwordUser.set(null);
        // Cambiar la propia contraseña invalida el token actual: hay que volver a entrar.
        if (isSelf) {
          this.auth.logout();
          return;
        }
        this.successMessage.set(response.message);
        this.loadUsers();
      },
      error: err => this.onFormError(err, 'No fue posible cambiar la contraseña.')
    });
  }

  private afterSave(message: string): void {
    this.saving.set(false);
    this.formOpen.set(false);
    this.successMessage.set(message);
    this.loadUsers();
  }

  private onFormError(error: any, fallback: string): void {
    this.saving.set(false);
    this.formError.set(error?.error?.message || fallback);
  }

  private passwordError(password: string, confirm: string): string | null {
    if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    if (password !== confirm) return 'Las contraseñas no coinciden.';
    return null;
  }

  private emptyForm(): UserForm {
    return { username: '', fullName: '', password: '', confirmPassword: '', role: 'CASHIER', sectionId: null, isActive: true };
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
