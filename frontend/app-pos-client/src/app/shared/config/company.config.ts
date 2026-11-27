import { environment } from '../../../environments/environment';
import { CompanyInfo } from '../models/receipt.models';

/**
 * Datos del establecimiento que se imprimen en el encabezado del recibo (POS-05).
 *
 * Se leen de `environment.company`:
 * · development/test → `src/environments/environment.ts` (placeholders)
 * · production       → `src/environments/environment.prod.ts` (datos reales,
 *                       inyectados en build/CI para no versionarlos).
 *
 * Los campos vacíos se omiten en el recibo; si no hay nombre se usa un genérico.
 */
const company = environment.company;

export const COMPANY_INFO: CompanyInfo = {
  name: company.name?.trim() || 'Punto de venta',
  nit: company.nit?.trim() ?? '',
  address: company.address?.trim() ?? '',
  phone: company.phone?.trim() ?? '',
  email: company.email?.trim() || undefined
};

/** Mensajes del pie del recibo: agradecimiento y política de cambios/garantía. */
export const RECEIPT_MESSAGES = {
  thanks: '¡Gracias por su compra!',
  policy:
    '',
  /** Leyendas del pie: todo comprobante de Neptuno POS es de control interno (no es factura ante la DIAN). */
  internalNotice: 'Documento de control interno – No válido como factura.',
  /** Venta marcada para factura electrónica: la factura real se emite en otro software y llega al correo. */
  electronicNotice:'Documento de control interno – No válido como factura. La factura electrónica se enviará a su correo.'
};
