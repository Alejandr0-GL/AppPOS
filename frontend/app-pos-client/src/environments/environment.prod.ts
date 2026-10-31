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
  company: {
    name: '',
    nit: '',
    address: '',
    phone: '',
    email: ''
  }
};
