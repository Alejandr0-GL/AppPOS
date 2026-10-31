import { AppEnvironment } from './environment.model';

/**
 * Configuración de DESARROLLO / PRUEBAS.
 * Los datos de la empresa son placeholders: no corresponden a un negocio real.
 */
export const environment: AppEnvironment = {
  production: false,
  company: {
    name: 'Negocio de prueba',
    nit: '900.000.000-1',
    address: 'Calle Falsa 123 · Ciudad de prueba',
    phone: '+57 300 000 0000',
    email: 'pruebas@example.com'
  }
};
