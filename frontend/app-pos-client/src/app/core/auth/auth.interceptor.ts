import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../../shared/config/api.config';
import { AuthService } from './auth.service';

/**
 * SEC-01: agrega `Authorization: Bearer <token>` a las llamadas a la API y, si la API responde
 * 401 (token vencido, contraseña restablecida o usuario desactivado), vuelve al login.
 * 403 (sin permiso) se deja pasar: cada pantalla muestra su mensaje.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApiCall = req.url.startsWith(API_URL);
  const isLogin = isApiCall && req.url.endsWith('/Auth/login');
  const token = isApiCall && !isLogin ? auth.token() : null;
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (isApiCall && !isLogin && error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout('expired');
      }
      return throwError(() => error);
    })
  );
};
