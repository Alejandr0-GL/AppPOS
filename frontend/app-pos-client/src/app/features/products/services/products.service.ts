import { Injectable, inject } from '@angular/core';
import { API_URL } from '../../../shared/config/api.config';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductCatalogItem } from '../../../shared/models/pos.models';

export interface ProductOption {
  categoryId?: number;
  taxId?: number;
  sectionId?: number;
  name: string;
  percentage?: number;
  description?: string;
}

export interface CategoryOption {
  categoryId: number;
  sectionId: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: number;
  taxId: number;
  purchasePrice: number;
  salePrice: number;
  sectionId: number;
  initialStock: number;
  minStock: number;
  isService: boolean;
  /** POS-07: ítem abierto ("Otros"). */
  isOpenItem: boolean;
  employeeCommissionPercentage: number;
  businessProfitPercentage: number;
}

export interface UpdateProductRequest extends Omit<CreateProductRequest, 'sectionId' | 'initialStock' | 'minStock'> {
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;

  getProducts(sectionId?: number, search?: string, status: 'active' | 'inactive' | 'all' = 'active'): Observable<ProductCatalogItem[]> {
    const params = new URLSearchParams();
    if (sectionId) params.set('sectionId', sectionId.toString());
    if (search) params.set('search', search);
    params.set('status', status);
    return this.http.get<ProductCatalogItem[]>(`${this.apiUrl}/Products?${params.toString()}`);
  }

  getCategories(sectionId: number): Observable<ProductOption[]> {
    return this.http.get<ProductOption[]>(`${this.apiUrl}/Categories?sectionId=${sectionId}`);
  }

  getTaxes(): Observable<ProductOption[]> {
    return this.http.get<ProductOption[]>(`${this.apiUrl}/Taxes`);
  }

  getCategoriesForManagement(sectionId: number): Observable<CategoryOption[]> {
    return this.http.get<CategoryOption[]>(`${this.apiUrl}/Categories?sectionId=${sectionId}&includeInactive=true`);
  }

  createCategory(category: { name: string; description?: string; sectionId: number }): Observable<CategoryOption> {
    return this.http.post<CategoryOption>(`${this.apiUrl}/Categories`, category);
  }

  updateCategory(categoryId: number, category: { categoryId: number; sectionId: number; name: string; description?: string; isActive: boolean }): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/Categories/${categoryId}`, category);
  }

  createProduct(product: CreateProductRequest): Observable<{ productId: number; message: string }> {
    return this.http.post<{ productId: number; message: string }>(`${this.apiUrl}/Products`, product);
  }

  updateProduct(productId: number, product: UpdateProductRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/Products/${productId}`, product);
  }

  /** POS-07: sube (o reemplaza) la imagen del producto. */
  uploadProductImage(productId: number, file: File): Observable<{ message: string; imageUrl: string }> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<{ message: string; imageUrl: string }>(`${this.apiUrl}/Products/${productId}/image`, body);
  }

  /** POS-07: quita la imagen del producto. */
  deleteProductImage(productId: number): Observable<{ message: string; imageUrl: null }> {
    return this.http.delete<{ message: string; imageUrl: null }>(`${this.apiUrl}/Products/${productId}/image`);
  }
}