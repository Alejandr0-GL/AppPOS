import { environment } from '../../../environments/environment';

/**
 * POS-07: URL base de la API (desde `environment.apiUrl`), sin barra final.
 * Todos los servicios construyen sus rutas a partir de aquí: `${API_URL}/Products`.
 */
export const API_URL = environment.apiUrl.trim().replace(/\/+$/, '');

/**
 * Origen del servidor de la API (sin `/api`), usado para archivos que la API sirve fuera
 * de `/api`, como las imágenes de productos (`/uploads/products/...`).
 * Vacío cuando `apiUrl` es relativo (`/api`): las rutas quedan relativas al mismo dominio.
 */
export const API_ORIGIN = API_URL.replace(/\/api$/i, '');
