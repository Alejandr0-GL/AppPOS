import { Component, effect, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { PosService, Section } from './services/pos.service';
import { Product, Customer, CreateOrderDto } from '../../shared/models/pos.models';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-full gap-4 p-4">
      <!-- PANEL IZQUIERDO: Selección de Tienda, Buscador y Catálogo Exclusivo -->
      <div class="flex-1 flex flex-col gap-4">
        
        <!-- Barra de Búsqueda de Productos -->
        <div class="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex gap-3">
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            (input)="filterProducts()"
            placeholder="Buscar producto en esta unidad de negocio..." 
            class="flex-1 px-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 text-sm"
          />
        </div>

        <!-- Grid de Catálogo -->
        <div class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          @for (product of filteredProducts(); track product.productId) {
            <div 
              (click)="addToCart(product)"
              class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between group">
              <div>
                <span class="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">SKU: {{ product.sku }}</span>
                <h3 class="font-bold text-slate-800 mt-2 text-sm group-hover:text-indigo-600 transition-colors">{{ product.name }}</h3>
              </div>
              <div class="mt-4 flex justify-between items-end border-t border-slate-100 pt-2">
                <span class="text-xs text-slate-400">Precio</span>
                <span class="text-base font-extrabold text-emerald-600">\${{ product.salePrice | number:'1.2-2' }}</span>
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
              No hay productos registrados en esta tienda.
            </div>
          }
        </div>
      </div>

      <!-- PANEL DERECHO: Carrito Aislado y Cobro -->
      <div class="w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        
        <!-- Búsqueda Dinámica Autocomplete de Cliente (POS-01) -->
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl relative">
          <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Cliente</label>
          
          @if (!selectedCustomer()) {
            <div class="relative">
              <input 
                type="text" 
                [(ngModel)]="customerSearchQuery"
                (input)="onCustomerSearchInput()"
                placeholder="Escribe Cédula o Nombre..." 
                class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
              />
              
              <!-- Desplegable dinámico de sugerencias -->
              @if (customerSearchResults().length > 0) {
                <div class="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                  @for (cust of customerSearchResults(); track cust.customerId) {
                    <div 
                      (click)="selectCustomer(cust)"
                      class="p-2.5 hover:bg-indigo-50 cursor-pointer transition-colors text-xs flex justify-between items-center">
                      <div>
                        <span class="font-bold text-slate-800 block">{{ cust.name }}</span>
                        <span class="text-slate-400">Doc: {{ cust.documentNumber }}</span>
                      </div>
                      <span class="text-indigo-600 font-semibold text-[10px] bg-indigo-100 px-1.5 py-0.5 rounded">Seleccionar</span>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Tarjeta del Cliente Seleccionado -->
            <div class="text-xs font-semibold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex justify-between items-center">
              <div>
                <span class="font-bold block text-indigo-900">{{ selectedCustomer()?.name }}</span>
                <span class="text-indigo-500 font-normal">Doc: {{ selectedCustomer()?.documentNumber }}</span>
              </div>
              <button (click)="removeCustomer()" class="text-slate-400 hover:text-red-500 p-1 font-bold">✕</button>
            </div>
          }
        </div>

        <!-- Lista del Carrito -->
        <div class="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          @for (item of cart(); track item.product.productId; let i = $index) {
            <div class="py-3 flex justify-between items-center gap-2">
              <div class="flex-1">
                <h4 class="font-medium text-slate-800 text-sm">{{ item.product.name }}</h4>
                <span class="text-xs text-slate-400">\${{ item.product.salePrice }} c/u</span>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="updateQuantity(i, -1)" class="w-6 h-6 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">-</button>
                <span class="text-sm font-bold w-4 text-center">{{ item.quantity }}</span>
                <button (click)="updateQuantity(i, 1)" class="w-6 h-6 rounded bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">+</button>
              </div>
              <span class="font-bold text-sm text-slate-700 w-16 text-right">\${{ item.quantity * item.product.salePrice | number:'1.2-2' }}</span>
            </div>
          } @empty {
            <div class="text-center py-12 text-slate-400 text-sm">
              Carrito de esta tienda vacío
            </div>
          }
        </div>

        <!-- Configuración de Factura y Totales -->
        <div class="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl space-y-3">
          <div class="flex gap-2">
            <button 
              (click)="invoiceType = 'POS'"
              [class.bg-indigo-600]="invoiceType === 'POS'"
              [class.text-white]="invoiceType === 'POS'"
              class="flex-1 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 bg-white">
              Ticket POS
            </button>
            <button 
              (click)="invoiceType = 'ELECTRONIC'"
              [class.bg-indigo-600]="invoiceType === 'ELECTRONIC'"
              [class.text-white]="invoiceType === 'ELECTRONIC'"
              class="flex-1 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 bg-white">
              Factura Electrónica
            </button>
          </div>

          <div class="space-y-1 pt-2 border-t border-slate-200 text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>\${{ cartTotal() | number:'1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-lg font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Pagar</span>
              <span class="text-emerald-600">\${{ cartTotal() | number:'1.2-2' }}</span>
            </div>
          </div>

          <button 
            [disabled]="cart().length === 0 || !selectedCustomer()"
            (click)="checkout()"
            class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all text-center">
            Procesar Venta
          </button>
        </div>
      </div>
    </div>
  `
})
export class PosComponent implements OnInit {
  private posService = inject(PosService);

  sections = signal<Section[]>([]);
  selectedSectionId = signal<number>(1);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  
  cart = this.posService.cartItems;
  
  // Cliente & Búsqueda reactiva
  selectedCustomer = signal<Customer | null>(null);
  customerSearchQuery = '';
  customerSearchResults = signal<Customer[]>([]);
  private customerSearchSubject = new Subject<string>();

  searchQuery = '';
  invoiceType: 'POS' | 'ELECTRONIC' = 'POS';

  private readonly sectionEffect = effect(() => {
    const sectionId = this.posService.selectedSectionId();
    if (!sectionId || sectionId === this.selectedSectionId()) return;

    this.selectedSectionId.set(sectionId);
    this.searchQuery = '';
    this.loadProductsForSection(sectionId);
  });

  cartTotal = computed(() => {
    return this.cart().reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
  });

  ngOnInit() {
    this.loadSections();
    this.setupCustomerSearchPipeline();
  }

  // Pipeline RxJS con debounce (300ms) para búsqueda fluida en tiempo real
  private setupCustomerSearchPipeline() {
    this.customerSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query.trim()) return of([]);
        return this.posService.searchCustomers(query);
      })
    ).subscribe({
      next: (results) => this.customerSearchResults.set(results),
      error: () => this.customerSearchResults.set([])
    });
  }

  onCustomerSearchInput() {
    this.customerSearchSubject.next(this.customerSearchQuery);
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.customerSearchResults.set([]);
    this.customerSearchQuery = '';
  }

  removeCustomer() {
    this.selectedCustomer.set(null);
  }

  loadSections() {
    this.posService.getSections().subscribe({
      next: (data) => {
        this.sections.set(data);
        if (data.length > 0) {
          const sectionId = this.posService.selectedSectionId() ?? data[0].sectionId;
          this.selectedSectionId.set(sectionId);
          this.posService.selectedSectionId.set(sectionId);
          this.loadProductsForSection(sectionId);
        }
      }
    });
  }

  loadProductsForSection(sectionId: number) {
    this.posService.getProductsBySection(sectionId).subscribe({
      next: (data) => {
        this.products.set(data);
        this.filteredProducts.set(data);
      }
    });
  }

  filterProducts() {
    const q = this.searchQuery.toLowerCase();
    this.filteredProducts.set(
      this.products().filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    );
  }

  addToCart(product: Product) {
    const currentCart = [...this.cart()];
    const index = currentCart.findIndex(item => item.product.productId === product.productId);

    if (index > -1) {
      currentCart[index].quantity += 1;
    } else {
      currentCart.push({ product, quantity: 1, sectionId: this.selectedSectionId() });
    }

    this.cart.set(currentCart);
  }

  updateQuantity(index: number, change: number) {
    const currentCart = [...this.cart()];
    currentCart[index].quantity += change;

    if (currentCart[index].quantity <= 0) {
      currentCart.splice(index, 1);
    }

    this.cart.set(currentCart);
  }

  checkout() {
    const customer = this.selectedCustomer();
    if (!customer) return;

    const orderDto: CreateOrderDto = {
      userId: 1,
      customerId: customer.customerId,
      sectionId: this.selectedSectionId(),
      paymentMethod: 'CASH',
      invoiceType: this.invoiceType,
      details: this.cart().map(item => ({
        productId: item.product.productId,
        sectionId: item.sectionId,
        quantity: item.quantity,
        unitPrice: item.product.salePrice
      }))
    };

    this.posService.processSale(orderDto).subscribe({
      next: (res) => {
        alert(`¡Venta procesada con éxito! N° Orden: ${res.orderId}`);
        this.cart.set([]);
        this.selectedCustomer.set(null);
      },
      error: (err) => alert(`Error al cobrar: ${err.error?.message || err.message}`)
    });
  }
}