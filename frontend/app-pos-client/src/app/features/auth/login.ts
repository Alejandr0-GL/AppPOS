import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

/** SEC-01: inicio de sesión (usuario + contraseña → JWT). */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 font-sans">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center justify-center gap-2 text-2xl font-bold tracking-wider text-slate-900">
          <span class="rounded-lg bg-indigo-600 p-2 text-sm text-white">POS</span>
          <span>AppPOS</span>
        </div>

        <form (ngSubmit)="submit()" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 class="text-xl font-black text-slate-900">Iniciar sesión</h1>
            <p class="text-sm text-slate-500">Ingresa con tu usuario de la caja.</p>
          </div>

          @if (expired()) {
            <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Tu sesión terminó. Inicia sesión de nuevo.</div>
          }
          @if (errorMessage()) {
            <div role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div>
          }

          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Usuario
            <input #usernameInput name="username" [(ngModel)]="username" autocomplete="username" autocapitalize="none" spellcheck="false" required
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          </label>

          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña
            <div class="relative mt-1">
              <input name="password" [(ngModel)]="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" required
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-20 text-sm font-normal text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              <button type="button" (click)="showPassword.set(!showPassword())" [attr.aria-pressed]="showPassword()"
                class="absolute inset-y-0 right-0 px-3 text-xs font-bold normal-case tracking-normal text-slate-500 hover:text-indigo-600">
                {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </label>

          <button type="submit" [disabled]="loading()"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {{ loading() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </form>

        <p class="mt-4 text-center text-xs text-slate-400">¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.</p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly usernameInput = viewChild<ElementRef<HTMLInputElement>>('usernameInput');

  username = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly expired = signal(this.route.snapshot.queryParamMap.get('reason') === 'expired');

  constructor() {
    afterNextRender(() => this.usernameInput()?.nativeElement.focus());
  }

  submit(): void {
    if (this.loading()) return;
    const username = this.username.trim();
    if (!username || !this.password) {
      this.errorMessage.set('Ingresa el usuario y la contraseña.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.expired.set(false);

    this.auth.login(username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.password = '';
        this.router.navigateByUrl(this.safeReturnUrl() ?? this.auth.homeUrl());
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.password = '';
        this.errorMessage.set(
          error.status === 0
            ? 'No se pudo conectar con el servidor. Revisa que la API esté encendida.'
            : error.error?.message || 'No fue posible iniciar sesión.'
        );
      }
    });
  }

  /** Sólo rutas internas (evita redirecciones a otros sitios). */
  private safeReturnUrl(): string | null {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : null;
  }
}
