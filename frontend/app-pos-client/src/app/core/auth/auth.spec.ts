import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { API_URL } from '../../shared/config/api.config';
import { AuthService, LoginResponse, SESSION_STORAGE_KEY, parseExpiresAt } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { adminGuard, authGuard } from './auth.guards';

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

function loginResponse(role: 'ADMIN' | 'CASHIER', expiresAt = inHours(12)): LoginResponse {
  return {
    token: `token-${role}`,
    expiresAt,
    user: { userId: role === 'ADMIN' ? 1 : 2, username: role === 'ADMIN' ? 'admin' : 'caja1', fullName: null, role, sectionId: role === 'ADMIN' ? null : 1, sectionName: role === 'ADMIN' ? null : 'Lubricentro' }
  };
}

describe('SEC-01 auth', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  function login(role: 'ADMIN' | 'CASHIER', expiresAt?: string): void {
    auth.login('usuario', 'clave').subscribe();
    http.expectOne(`${API_URL}/Auth/login`).flush(loginResponse(role, expiresAt));
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    http?.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('parseExpiresAt interpreta fechas sin zona como UTC', () => {
    expect(parseExpiresAt('2026-11-07T10:00:00')).toBe(Date.UTC(2026, 10, 7, 10, 0, 0));
    expect(parseExpiresAt('2026-11-07T10:00:00Z')).toBe(Date.UTC(2026, 10, 7, 10, 0, 0));
  });

  it('login guarda la sesión y expone el rol', () => {
    setup();
    expect(auth.isAuthenticated()).toBe(false);
    login('CASHIER');
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(auth.displayName()).toBe('caja1');
    expect(auth.roleLabel()).toBe('Cajero');
    expect(auth.homeUrl()).toBe('/pos');
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!).token).toBe('token-CASHIER');
  });

  it('el interceptor envía el token a la API pero no al login', () => {
    setup();
    login('ADMIN');
    TestBed.inject(HttpClient).get(`${API_URL}/Orders`).subscribe();
    expect(http.expectOne(`${API_URL}/Orders`).request.headers.get('Authorization')).toBe('Bearer token-ADMIN');

    TestBed.inject(HttpClient).get('https://otro.sitio/recurso').subscribe();
    expect(http.expectOne('https://otro.sitio/recurso').request.headers.has('Authorization')).toBe(false);
  });

  it('un 401 de la API cierra la sesión, limpia el estado y va al login', () => {
    setup();
    const cleanup = vi.fn();
    auth.onLogout(cleanup);
    login('CASHIER');
    TestBed.inject(HttpClient).get(`${API_URL}/Orders`).subscribe({ error: () => undefined });
    http.expectOne(`${API_URL}/Orders`).flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(cleanup).toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
  });

  it('un 403 no cierra la sesión', () => {
    setup();
    login('CASHIER');
    TestBed.inject(HttpClient).get(`${API_URL}/Dashboard/summary`).subscribe({ error: () => undefined });
    http.expectOne(`${API_URL}/Dashboard/summary`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('una sesión guardada y vencida se descarta al iniciar', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...loginResponse('ADMIN'), expiresAt: inHours(-1) }));
    setup();
    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('una sesión guardada vigente se recupera al recargar', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(loginResponse('ADMIN')));
    setup();
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
  });

  it('guards: sin sesión → login; cajero en ruta de administrador → POS', () => {
    setup();
    const state = { url: '/expenses' } as RouterStateSnapshot;
    const route = {} as ActivatedRouteSnapshot;

    const noSession = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(router.serializeUrl(noSession)).toBe('/login?returnUrl=%2Fexpenses');

    login('CASHIER');
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
    const blocked = TestBed.runInInjectionContext(() => adminGuard(route, state)) as UrlTree;
    expect(router.serializeUrl(blocked)).toBe('/pos');

    auth.logout();
    login('ADMIN');
    expect(TestBed.runInInjectionContext(() => adminGuard(route, state))).toBe(true);
  });
});
