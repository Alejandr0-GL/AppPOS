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
  company: CompanyEnvironment;
}
