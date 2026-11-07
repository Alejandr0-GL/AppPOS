import { API_ORIGIN } from '../config/api.config';

/**
 * POS-07: utilidades para la imagen del producto.
 *
 * `image_url` puede ser:
 * - relativa (`/uploads/products/12-abc.webp`): la sirve la propia API → se antepone API_ORIGIN
 *   (que sale de `environment.apiUrl`);
 * - absoluta (`https://…`): almacenamiento en la nube / CDN → se usa tal cual.
 */

/** Formatos aceptados (el servidor valida la firma real del archivo). */
export const PRODUCT_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function productImageSrc(imageUrl?: string | null): string | null {
  const value = imageUrl?.trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  // Sólo rutas servidas por la API (/uploads/...). Valores sueltos heredados de datos de
  // prueba ("url imagen", "imagenProducto2") se tratan como "sin imagen".
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return null;
}

/** Valida en el cliente antes de subir; devuelve el mensaje de error o null si es válida. */
export function validateProductImage(file: File): string | null {
  if (!PRODUCT_IMAGE_ACCEPT.split(',').includes(file.type)) return 'Formato no soportado. Usa JPG, PNG o WEBP.';
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return 'La imagen no puede superar 2 MB.';
  return null;
}
