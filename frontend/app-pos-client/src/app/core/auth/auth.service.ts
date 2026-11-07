import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../shared/config/api.config';

/** SEC-01: roles del sistema (mismo valor que `Users.role` en la API). */
export type UserRole = 'ADMIN' | 'CASHIER';

export interface SessionUser {
  userId: number;
  username: string;
  fullName?: string | null;
  role: UserRole;
  /** Unidad fija del cajero; null en el administrador (todas). */
  sectionId?: number | null;
  sectionName?: string | null;
}

export interface LoginResponse {
  token: string;
  /** Vencimiento del token (UTC, ISO). */
  expiresAt: string;
  user: SessionUser;
}

interface StoredSession {
  token: string;
  expiresAt: string;
  user: SessionUser;
}

export const SESSION_STORAGE_KEY = 'apppos.session';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  CASHIER: 'Cajero'
};

/** Fecha de vencimiento de la API: UTC aunque llegue sin la `Z` final. */
export function parseExpiresAt(expiresAt: string): number {
  const iso = /[zZ]|[+-]\d{2}:\d{2}$/.test(expiresAt) ? expiresAt : `${expiresAt}Z`;
  return new Date(iso).getTime();
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (!session?.token || !session.user || !(parseExpiresAt(session.expiresAt) > Date.now())) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * SEC-01: sesión del usuario (JWT). El token vive en localStorage para sobrevivir a recargas
 * de la caja; al vencer (12 h) o si la API responde 401 se vuelve al login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<StoredSession | null>(readStoredSession());
  private readonly logoutHandlers: Array<() => void> = [];
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');
  readonly displayName = computed(() => {
    const user = this.user();
    return user ? (user.fullName?.trim() || user.username) : '';
  });
  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  });

  constructor() {
    this.scheduleExpiry();
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  /** Token vigente o null (si venció, cierra la sesión). */
  token(): string | null {
    const session = this.session();
    if (!session) return null;
    if (!(parseExpiresAt(session.expiresAt) > Date.now())) {
      this.clearSession();
      return null;
    }
    return session.token;
  }

  login(username: string, password: string): Observable<SessionUser> {
    return this.http.post<LoginResponse>(`${API_URL}/Auth/login`, { username, password }).pipe(
      tap(response => {
        // Otro usuario en la misma caja: no heredar carrito ni unidad del anterior.
        if (this.user()?.userId !== response.user.userId) this.runLogoutHandlers();
        const session: StoredSession = { token: response.token, expiresAt: response.expiresAt, user: response.user };
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch {
          // Sin almacenamiento la sesión dura hasta recargar la página.
        }
        this.session.set(session);
        this.scheduleExpiry();
      }),
      map(response => response.user)
    );
  }

  /** Cierra la sesión y vuelve al login. `expired` muestra el aviso de sesión vencida. */
  logout(reason?: 'expired'): void {
    const hadSession = this.session() !== null;
    this.clearSession();
    if (!hadSession && this.router.url.startsWith('/login')) return;
    this.router.navigate(['/login'], { queryParams: reason ? { reason } : {} });
  }

  /** Ruta inicial según el rol. */
  homeUrl(): string {
    return this.isAdmin() ? '/dashboard' : '/pos';
  }

  /** Limpieza de estado en memoria al cerrar sesión (carrito, unidad seleccionada…). */
  onLogout(handler: () => void): void {
    this.logoutHandlers.push(handler);
  }

  private clearSession(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignorar
    }
    const hadSession = this.session() !== null;
    this.session.set(null);
    if (hadSession) this.runLogoutHandlers();
  }

  private runLogoutHandlers(): void {
    for (const handler of this.logoutHandlers) handler();
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const session = this.session();
    if (!session) return;
    const remaining = parseExpiresAt(session.expiresAt) - Date.now();
    this.expiryTimer = setTimeout(() => this.logout('expired'), Math.max(0, Math.min(remaining, 2_147_000_000)));
  }
}
