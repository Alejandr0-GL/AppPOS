import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** SEC-01: exige sesión; si no hay, va al login y recuerda a dónde quería entrar. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** SEC-01: pantallas sólo de administrador; el cajero vuelve al POS. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/pos']);
};

/** El login no se muestra si ya hay sesión. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).parseUrl(auth.homeUrl()) : true;
};

/** Inicio según el rol: administrador → dashboard, cajero → POS. */
export const homeRedirect: RedirectFunction = () => inject(AuthService).homeUrl();
