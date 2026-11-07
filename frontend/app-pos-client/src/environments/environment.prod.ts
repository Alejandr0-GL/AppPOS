import { AppEnvironment } from './environment.model';

/**
 * Configuración de PRODUCCIÓN.
 *
 * Los datos reales del negocio se completan aquí al compilar (o se inyectan desde
 * CI/pipeline reemplazando este archivo) para que NO queden versionados en el
 * repositorio. Los campos vacíos simplemente se omiten del recibo impreso.
 */
export const environment: AppEnvironment = {
  production: true,
  // POS-07: al desplegar, poner la URL pública de la API (https://api.midominio.com/api)
  // o dejar '/api' si el frontend y la API se publican bajo el mismo dominio.
  apiUrl: '/api',
  company: {
    name: '',
    nit: '',
    address: '',
    phone: '',
    email: ''
  }
};
