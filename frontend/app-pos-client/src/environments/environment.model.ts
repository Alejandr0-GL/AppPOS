/** Datos del establecimiento que se imprimen en el encabezado del recibo (POS-05). */
export interface CompanyEnvironment {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
}

export interface AppEnvironment {
  production: boolean;
  /**
   * POS-07: URL base de la API, terminada en `/api` y sin barra final
   * (p. ej. `https://api.midominio.com/api`). Con `/api` el frontend llama al mismo
   * dominio donde está publicado (frontend y API detrás del mismo proxy inverso).
   */
  apiUrl: string;
  company: CompanyEnvironment;
}
