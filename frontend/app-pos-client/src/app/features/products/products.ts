import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductCatalogItem } from '../../shared/models/pos.models';
import { PosService, Section } from '../pos/services/pos.service';
import { CategoryOption, CreateProductRequest, ProductOption, ProductsService, UpdateProductRequest } from './services/products.service';

interface ProductForm { productId?: number; name: string; sku: string; barcode: string; description: string; categoryId: number; taxId: number; purchasePrice: number; salePrice: number; sectionId: number | null; initialStock: number; minStock: number; isActive: boolean; isService: boolean; employeeCommissionPercentage: number; businessProfitPercentage: number; }

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="space-y-4 p-4 md:p-6">
      <header class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wider text-indigo-600">PROD-01</p><h2 class="text-2xl font-black text-slate-900">Catálogo de productos</h2><p class="text-sm text-slate-500">Administra el catálogo maestro y su disponibilidad por unidad.</p></div><div class="flex gap-2"><button (click)="openCategoryManagement()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Gestionar Categorías</button><button (click)="openCreate()" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Nuevo producto</button></div></header>
      <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_auto]"><label class="text-xs font-bold uppercase text-slate-500">Buscar<input [(ngModel)]="search" (ngModelChange)="loadProducts()" type="search" placeholder="Nombre, SKU o barcode" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" /></label><label class="text-xs font-bold uppercase text-slate-500">Estado<select [(ngModel)]="status" (ngModelChange)="loadProducts()" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="all">Todos</option></select></label><button (click)="loadProducts()" class="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Actualizar</button></div>
      @if (errorMessage()) { <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage() }}</div> }
      @if (successMessage()) { <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{{ successMessage() }}</div> }
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table class="w-full min-w-[1100px] text-left text-sm"><thead class="bg-slate-50 text-xs uppercase text-slate-500"><tr><th class="px-4 py-3">SKU</th><th class="px-4 py-3">Barcode</th><th class="px-4 py-3">Nombre</th><th class="px-4 py-3">Tipo</th><th class="px-4 py-3">Categoría</th><th class="px-4 py-3">Impuesto</th><th class="px-4 py-3">Compra</th><th class="px-4 py-3">Venta</th><th class="px-4 py-3">Sección</th><th class="px-4 py-3">Estado</th><th class="px-4 py-3"></th></tr></thead><tbody class="divide-y divide-slate-100">@for (product of products(); track product.productId) {<tr><td class="px-4 py-3 font-mono text-xs">{{ product.sku }}</td><td class="px-4 py-3">{{ product.barcode || '-' }}</td><td class="px-4 py-3 font-bold">{{ product.name }}</td><td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-indigo-100]="product.isService" [class.text-indigo-700]="product.isService" [class.bg-slate-100]="!product.isService" [class.text-slate-600]="!product.isService">{{ product.isService ? 'Servicio' : 'Producto' }}</span></td><td class="px-4 py-3">{{ product.category?.name || '-' }}</td><td class="px-4 py-3">{{ product.tax?.name || '-' }} ({{ product.tax?.percentage || 0 }}%)</td><td class="px-4 py-3">{{ product.purchasePrice | currency:'COP':'symbol':'1.0-0' }}</td><td class="px-4 py-3">{{ product.salePrice | currency:'COP':'symbol':'1.0-0' }}</td><td class="px-4 py-3">{{ sectionNames(product) }}</td><td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-xs font-bold" [class.bg-emerald-100]="product.isActive" [class.text-emerald-700]="product.isActive">{{ product.isActive ? 'Activo' : 'Inactivo' }}</span></td><td class="px-4 py-3 text-right"><button (click)="openEdit(product)" class="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">Editar</button></td></tr>} @empty {<tr><td colspan="11" class="px-4 py-10 text-center text-slate-400">No hay productos.</td></tr>}</tbody></table></div>

      @if (productModalOpen()) {<div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeProductModal()"></div><section class="fixed inset-4 z-50 m-auto max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div class="flex justify-between border-b pb-4"><h3 class="text-xl font-black">{{ form.productId ? 'Editar producto' : 'Nuevo producto' }}</h3><button (click)="closeProductModal()" class="text-2xl text-slate-400">&times;</button></div><div class="grid gap-3 py-5 md:grid-cols-2"><label class="text-xs font-bold uppercase">Nombre *<input [(ngModel)]="form.name" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">SKU *<input [(ngModel)]="form.sku" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Barcode<input [(ngModel)]="form.barcode" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Categoría *<span class="mt-1 flex gap-2"><select [(ngModel)]="form.categoryId" class="min-w-0 flex-1 rounded border px-3 py-2 text-sm"><option [ngValue]="0">Seleccionar</option>@for (category of categories(); track category.categoryId) {<option [ngValue]="category.categoryId">{{ category.name }}</option>}</select><button type="button" (click)="openQuickCategory()" class="w-10 rounded bg-slate-900 text-lg font-bold text-white">+</button></span></label><label class="text-xs font-bold uppercase">Impuesto *<select [(ngModel)]="form.taxId" class="mt-1 w-full rounded border px-3 py-2 text-sm"><option [ngValue]="0">Seleccionar</option>@for (tax of taxes(); track tax.taxId) {<option [ngValue]="tax.taxId">{{ tax.name }} ({{ tax.percentage }}%)</option>}</select></label><label class="text-xs font-bold uppercase">Precio compra *<span class="text-slate-400">{{ form.isService ? ' (costo insumo)' : '' }}</span><input [(ngModel)]="form.purchasePrice" type="number" min="0" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Precio venta *<input [(ngModel)]="form.salePrice" type="number" min="0" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase md:col-span-2">Descripción<input [(ngModel)]="form.description" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="flex items-center gap-2 text-sm font-bold md:col-span-2"><input [(ngModel)]="form.isService" type="checkbox" /> Es Servicio / Mano de Obra</label><label class="text-xs font-bold uppercase">% Comisión Empleado<input [(ngModel)]="form.employeeCommissionPercentage" type="number" min="0" max="100" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">% Ganancia Local<input [(ngModel)]="form.businessProfitPercentage" type="number" min="0" max="100" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><p class="text-xs font-bold md:col-span-2" [class.text-red-600]="percentageSum() !== 100" [class.text-slate-500]="percentageSum() === 100">Suma de porcentajes: {{ percentageSum() }}% (debe ser 100%)</p>@if (!form.productId) {<p class="text-xs font-bold uppercase text-slate-500 md:col-span-2">Unidad de negocio: <span class="text-slate-800">{{ activeSectionName() }}</span> <span class="font-normal normal-case text-slate-400">(definida por el selector global)</span></p><label class="text-xs font-bold uppercase">Stock inicial<input [(ngModel)]="form.initialStock" [disabled]="form.isService" type="number" min="0" class="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400" /></label><label class="text-xs font-bold uppercase">Stock mínimo<input [(ngModel)]="form.minStock" [disabled]="form.isService" type="number" min="0" class="mt-1 w-full rounded border px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400" /></label>}@if (form.productId) {<label class="flex items-center gap-2 text-sm font-bold"><input [(ngModel)]="form.isActive" type="checkbox" /> Producto activo</label>}</div><div class="flex justify-end gap-2 border-t pt-4"><button (click)="closeProductModal()" class="rounded border px-4 py-2 text-sm font-bold">Cancelar</button><button (click)="save()" class="rounded bg-indigo-600 px-5 py-2 text-sm font-bold text-white">Guardar</button></div></section>}

      @if (categoryModalOpen()) {<div class="fixed inset-0 z-[60] bg-slate-950/50" (click)="closeCategoryManagement()"></div><section class="fixed inset-8 z-[70] m-auto max-h-[calc(100vh-4rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div class="flex justify-between border-b pb-4"><div><p class="text-xs font-bold uppercase text-indigo-600">Catálogo auxiliar</p><h3 class="text-xl font-black">Gestionar categorías</h3></div><button (click)="closeCategoryManagement()" class="text-2xl text-slate-400">&times;</button></div><div class="grid gap-2 py-4 md:grid-cols-[1fr_1fr_auto]"><input [(ngModel)]="categoryName" placeholder="Nombre" class="rounded border px-3 py-2 text-sm" /><input [(ngModel)]="categoryDescription" placeholder="Descripción" class="rounded border px-3 py-2 text-sm" /><button (click)="saveCategory()" class="rounded bg-indigo-600 px-4 py-2 text-sm font-bold text-white">{{ editingCategoryId ? 'Guardar' : 'Agregar' }}</button></div><table class="w-full text-left text-sm"><thead class="bg-slate-50 text-xs uppercase"><tr><th class="px-3 py-2">Nombre</th><th class="px-3 py-2">Descripción</th><th class="px-3 py-2">Estado</th><th></th></tr></thead><tbody class="divide-y">@for (category of managedCategories(); track category.categoryId) {<tr><td class="px-3 py-2 font-bold">{{ category.name }}</td><td class="px-3 py-2">{{ category.description || '-' }}</td><td class="px-3 py-2">{{ category.isActive ? 'Activa' : 'Inactiva' }}</td><td class="px-3 py-2 text-right"><button (click)="editCategory(category)" class="text-xs font-bold text-indigo-600">Editar</button></td></tr>} @empty {<tr><td colspan="4" class="px-3 py-8 text-center text-slate-400">No hay categorías.</td></tr>}</tbody></table></section>}
      @if (categoryModalOpen() && editingCategoryId) {<div class="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl"><label class="flex items-center gap-2 text-sm font-bold text-slate-700"><input [(ngModel)]="categoryActive" type="checkbox" /> Categoría activa</label></div>}
    </section>
  `
})
export class ProductsComponent {
  private readonly productsService = inject(ProductsService);
  private readonly posService = inject(PosService);
  products = signal<ProductCatalogItem[]>([]);
  categories = signal<ProductOption[]>([]);
  managedCategories = signal<CategoryOption[]>([]);
  taxes = signal<ProductOption[]>([]);
  sections = signal<Section[]>([]);
  activeSectionName = computed(() => {
    const sectionId = this.posService.selectedSectionId();
    return this.sections().find(section => section.sectionId === sectionId)?.name ?? 'Unidad activa';
  });
  productModalOpen = signal(false);
  categoryModalOpen = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  search = '';
  status: 'active' | 'inactive' | 'all' = 'active';
  form: ProductForm = this.emptyForm();
  categoryName = '';
  categoryDescription = '';
  editingCategoryId: number | null = null;
  categoryActive = true;

  private readonly sectionEffect = effect(() => { const sectionId = this.posService.selectedSectionId(); if (sectionId) { this.loadCategories(sectionId); this.loadProducts(); } });
  constructor() { this.loadOptions(); }
  loadOptions(): void { this.posService.getSections().subscribe({ next: value => this.sections.set(value) }); this.productsService.getTaxes().subscribe({ next: value => this.taxes.set(value) }); }
  loadCategories(sectionId: number): void { this.productsService.getCategories(sectionId).subscribe({ next: value => this.categories.set(value), error: error => this.showError(error) }); }
  loadProducts(): void { const sectionId = this.posService.selectedSectionId() || undefined; if (!sectionId) return; this.productsService.getProducts(sectionId, this.search, this.status).subscribe({ next: value => this.products.set(value), error: error => this.showError(error) }); }
  sectionNames(product: ProductCatalogItem): string {
    if (product.sections.length) return product.sections.map(section => section.name).join(', ');
    const section = this.sections().find(item => item.sectionId === product.categorySectionId);
    return section?.name ?? 'Sin sección';
  }
  openCreate(): void { this.form = this.emptyForm(); this.form.sectionId = this.posService.selectedSectionId(); this.productModalOpen.set(true); this.clearMessages(); }
  openEdit(product: ProductCatalogItem): void { this.form = { productId: product.productId, name: product.name, sku: product.sku, barcode: product.barcode || '', description: product.description || '', categoryId: product.categoryId, taxId: product.taxId, purchasePrice: product.purchasePrice, salePrice: product.salePrice, sectionId: null, initialStock: 0, minStock: 0, isActive: product.isActive, isService: product.isService, employeeCommissionPercentage: product.employeeCommissionPercentage, businessProfitPercentage: product.businessProfitPercentage }; this.productModalOpen.set(true); this.clearMessages(); }
  closeProductModal(): void { this.productModalOpen.set(false); }
  save(): void {
    this.clearMessages();

    if (!this.form.name.trim() || !this.form.sku.trim() || !this.form.categoryId || !this.form.taxId || this.form.purchasePrice < 0 || this.form.salePrice < 0) {
      this.errorMessage.set('Completa los campos obligatorios y verifica los precios.');
      return;
    }

    if (this.form.employeeCommissionPercentage < 0 || this.form.employeeCommissionPercentage > 100 || this.form.businessProfitPercentage < 0 || this.form.businessProfitPercentage > 100) {
      this.errorMessage.set('Los porcentajes de comisión y ganancia deben estar entre 0 y 100.');
      return;
    }

    if (this.percentageSum() !== 100) {
      this.errorMessage.set('La suma del % de comisión del empleado y el % de ganancia local debe ser 100.');
      return;
    }

    const shared = {
      name: this.form.name,
      sku: this.form.sku,
      barcode: this.form.barcode,
      description: this.form.description,
      categoryId: this.form.categoryId,
      taxId: this.form.taxId,
      purchasePrice: this.form.purchasePrice,
      salePrice: this.form.salePrice,
      isService: this.form.isService,
      employeeCommissionPercentage: this.form.employeeCommissionPercentage,
      businessProfitPercentage: this.form.businessProfitPercentage
    };

    if (this.form.productId) {
      const data: UpdateProductRequest = { ...shared, isActive: this.form.isActive };
      this.productsService.updateProduct(this.form.productId, data).subscribe({ next: value => this.finish(value.message), error: error => this.showError(error) });
      return;
    }

    const sectionId = this.posService.selectedSectionId();
    if (!sectionId || (!this.form.isService && (this.form.initialStock < 0 || this.form.minStock < 0))) {
      this.errorMessage.set('Selecciona una unidad de negocio en la barra superior y utiliza stocks no negativos.');
      return;
    }

    const data: CreateProductRequest = {
      ...shared,
      sectionId,
      initialStock: this.form.isService ? 0 : this.form.initialStock,
      minStock: this.form.isService ? 0 : this.form.minStock
    };

    this.productsService.createProduct(data).subscribe({ next: value => this.finish(value.message), error: error => this.showError(error) });
  }
  openCategoryManagement(): void { this.loadManagedCategories(); this.categoryModalOpen.set(true); }
  openQuickCategory(): void { this.loadManagedCategories(); this.categoryModalOpen.set(true); }
  closeCategoryManagement(): void { this.categoryModalOpen.set(false); this.resetCategoryForm(); }
  loadManagedCategories(): void { const sectionId = this.posService.selectedSectionId(); if (!sectionId) { this.showError({ error: { message: 'Selecciona una unidad de negocio antes de gestionar categorías.' } }); return; } this.productsService.getCategoriesForManagement(sectionId).subscribe({ next: value => this.managedCategories.set(value), error: error => this.showError(error) }); }
  editCategory(category: CategoryOption): void { this.editingCategoryId = category.categoryId; this.categoryName = category.name; this.categoryDescription = category.description || ''; this.categoryActive = category.isActive; }
  saveCategory(): void { const sectionId = this.posService.selectedSectionId(); if (!sectionId) { this.showError({ error: { message: 'Selecciona una unidad de negocio antes de guardar categorías.' } }); return; } if (!this.categoryName.trim()) { this.errorMessage.set('El nombre de la categoría es obligatorio.'); return; } if (this.editingCategoryId) { const category = this.managedCategories().find(item => item.categoryId === this.editingCategoryId); if (!category) return; this.productsService.updateCategory(this.editingCategoryId, { categoryId: category.categoryId, sectionId, name: this.categoryName.trim(), description: this.categoryDescription, isActive: this.categoryActive }).subscribe({ next: () => { this.loadManagedCategories(); this.loadCategories(sectionId); this.resetCategoryForm(); this.successMessage.set('Categoría actualizada correctamente.'); }, error: error => this.showError(error) }); return; } this.productsService.createCategory({ name: this.categoryName.trim(), description: this.categoryDescription, sectionId }).subscribe({ next: category => { this.form.categoryId = category.categoryId; this.loadManagedCategories(); this.loadCategories(sectionId); this.resetCategoryForm(); this.successMessage.set('Categoría creada y seleccionada.'); }, error: error => this.showError(error) }); }
  private resetCategoryForm(): void { this.categoryName = ''; this.categoryDescription = ''; this.editingCategoryId = null; this.categoryActive = true; }
  private finish(message: string): void { this.successMessage.set(message); this.closeProductModal(); this.loadProducts(); }
  private showError(error: any): void { this.errorMessage.set(error.error?.message || 'No fue posible completar la operación.'); }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
  percentageSum(): number {
    return Math.round((Number(this.form.employeeCommissionPercentage) + Number(this.form.businessProfitPercentage)) * 100) / 100;
  }

  private emptyForm(): ProductForm { return { name: '', sku: '', barcode: '', description: '', categoryId: 0, taxId: 0, purchasePrice: 0, salePrice: 0, sectionId: null, initialStock: 0, minStock: 5, isActive: true, isService: false, employeeCommissionPercentage: 0, businessProfitPercentage: 100 }; }
}
