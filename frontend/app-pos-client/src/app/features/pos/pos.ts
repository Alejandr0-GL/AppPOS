import { Component, effect, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { PosService, Section } from './services/pos.service';
import { Product, Customer, CreateOrderDto, Employee } from '../../shared/models/pos.models';
import { CustomersService } from '../customers/services/customers.service';
import { EmployeesService } from '../employees/services/employees.service';
import { ReceiptComponent } from '../../shared/components/receipt/receipt';
import { ReceiptData } from '../../shared/models/receipt.models';
import { buildReceiptData } from '../../shared/utils/receipt.mapper';

interface QuickCustomerForm {
  name: string;
  documentNumber: string;
  documentType: 'CC' | 'NIT' | 'CE' | 'PASSPORT';
  address: string;
  city: string;
  department: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReceiptComponent],
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
              <div class="flex gap-2"><input type="text" [(ngModel)]="customerSearchQuery" (input)="onCustomerSearchInput()" placeholder="Escribe Cédula o Nombre..." class="min-w-0 flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" /><button type="button" (click)="openQuickCustomer()" class="w-9 rounded-lg bg-slate-900 text-lg font-bold text-white" aria-label="Crear cliente">+</button></div>
              
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
                <h4 class="font-medium text-slate-800 text-sm">{{ item.product.name }} @if (item.product.isService) { <span class="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">Servicio</span> }</h4>
                <span class="text-xs text-slate-400">\${{ item.product.salePrice }} c/u</span>
                @if (requiresEmployee(item.product)) {
                  <select [(ngModel)]="item.employeeId" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                    <option [ngValue]="null">Asignar técnico responsable...</option>
                    @for (employee of employees(); track employee.employeeId) {
                      <option [ngValue]="employee.employeeId">{{ employee.name }}</option>
                    }
                  </select>
                }
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
              Factura de venta
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

          <!-- POS-05: método de pago y efectivo recibido (se imprimen en el recibo) -->
          <div class="space-y-2 pt-2 border-t border-slate-200">
            <div class="flex gap-2">
              <button
                type="button"
                (click)="setPaymentMethod('CASH')"
                [class.bg-slate-900]="paymentMethod === 'CASH'"
                [class.text-white]="paymentMethod === 'CASH'"
                class="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-600">
                Efectivo
              </button>
              <button
                type="button"
                (click)="setPaymentMethod('TRANSFER')"
                [class.bg-slate-900]="paymentMethod === 'TRANSFER'"
                [class.text-white]="paymentMethod === 'TRANSFER'"
                class="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-600">
                Transferencia
              </button>
            </div>

            @if (paymentMethod === 'CASH') {
              <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Efectivo recibido
                <input
                  type="number"
                  min="0"
                  step="1000"
                  [(ngModel)]="cashReceived"
                  placeholder="0"
                  class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-800" />
              </label>
              <div class="flex justify-between text-xs font-bold" [class.text-red-600]="cashReceived !== null && cashReceived > 0 && cashDifference < 0" [class.text-slate-600]="cashReceived === null || cashReceived <= 0 || cashDifference >= 0">
                <span>Cambio</span>
                <span>\${{ cashReceived !== null && cashReceived > 0 ? (cashDifference | number:'1.0-0') : '0' }}</span>
              </div>
            }
          </div>

          <button 
            [disabled]="cart().length === 0 || !selectedCustomer() || processingSale() || (paymentMethod === 'CASH' && cashReceived !== null && cashDifference < 0)"
            (click)="checkout()"
            class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all text-center">
            {{ processingSale() ? 'Procesando venta...' : 'Procesar Venta' }}
          </button>
        </div>
      </div>

      @if (customerModalOpen()) {<div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeQuickCustomer()"></div><section class="fixed inset-4 z-50 m-auto max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div class="flex justify-between border-b pb-4"><h3 class="text-xl font-black">Nuevo cliente</h3><button (click)="closeQuickCustomer()" class="text-2xl text-slate-400">&times;</button></div><div class="grid gap-3 py-5 md:grid-cols-2"><label class="text-xs font-bold uppercase">Nombre *<input [(ngModel)]="quickCustomer.name" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Tipo documento *<select [(ngModel)]="quickCustomer.documentType" (ngModelChange)="onQuickDocumentTypeChange()" class="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"><option value="CC">Cédula de Ciudadanía</option><option value="NIT">NIT</option><option value="CE">Cédula de Extranjería</option><option value="PASSPORT">Pasaporte</option></select></label><label class="text-xs font-bold uppercase">Número documento *<input [(ngModel)]="quickCustomer.documentNumber" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Teléfono<input [(ngModel)]="quickCustomer.phone" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Dirección<input [(ngModel)]="quickCustomer.address" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Ciudad<input [(ngModel)]="quickCustomer.city" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Departamento<input [(ngModel)]="quickCustomer.department" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Correo<input [(ngModel)]="quickCustomer.email" type="email" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label></div><div class="flex justify-end gap-2 border-t pt-4"><button (click)="closeQuickCustomer()" class="rounded border px-4 py-2 text-sm font-bold">Cancelar</button><button (click)="saveQuickCustomer()" class="rounded bg-indigo-600 px-5 py-2 text-sm font-bold text-white">Guardar cliente</button></div></section>}

      @if (receiptData(); as receipt) {
        <app-receipt [data]="receipt" [success]="saleCompleted()" (closed)="closeReceipt()"></app-receipt>
      }
    </div>
  `
})
export class PosComponent implements OnInit {
  private posService = inject(PosService);
  private customersService = inject(CustomersService);
  private employeesService = inject(EmployeesService);

  sections = signal<Section[]>([]);
  selectedSectionId = signal<number>(1);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  employees = signal<Employee[]>([]);
  
  cart = this.posService.cartItems;
  
  // Cliente & Búsqueda reactiva
  selectedCustomer = signal<Customer | null>(null);
  customerSearchQuery = '';
  customerSearchResults = signal<Customer[]>([]);
  private customerSearchSubject = new Subject<string>();
  customerModalOpen = signal(false);
  quickCustomer: QuickCustomerForm = this.emptyQuickCustomer();

  searchQuery = '';
  invoiceType: 'POS' | 'ELECTRONIC' = 'POS';

  // POS-05: cobro en efectivo/transferencia y recibo impreso
  paymentMethod: 'CASH' | 'TRANSFER' = 'CASH';
  cashReceived: number | null = null;
  processingSale = signal(false);
  receiptData = signal<ReceiptData | null>(null);
  saleCompleted = signal(false);

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

  /** Diferencia entre el efectivo recibido y el total (negativa = falta dinero). */
  get cashDifference(): number {
    return (this.cashReceived ?? 0) - this.cartTotal();
  }

  setPaymentMethod(method: 'CASH' | 'TRANSFER'): void {
    this.paymentMethod = method;
    if (method !== 'CASH') {
      this.cashReceived = null;
    }
  }

  closeReceipt(): void {
    this.receiptData.set(null);
    this.saleCompleted.set(false);
    // El stock pudo cambiar con la venta: refrescar el catálogo de la unidad.
    this.loadProductsForSection(this.selectedSectionId());
  }

  private openReceipt(orderId: number): void {
    this.posService.getOrder(orderId).subscribe({
      next: order => {
        this.receiptData.set(buildReceiptData(order));
        this.saleCompleted.set(true);
      },
      error: () => alert('La venta se registró, pero no fue posible cargar el recibo para imprimir.')
    });
  }

  ngOnInit() {
    this.loadSections();
    this.loadEmployees();
    this.setupCustomerSearchPipeline();
  }

  loadEmployees() {
    this.employeesService.getEmployees().subscribe({
      next: (employees) => this.employees.set(employees),
      error: () => this.employees.set([])
    });
  }

  requiresEmployee(product: Product): boolean {
    return product.isService || product.employeeCommissionPercentage > 0;
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

  openQuickCustomer() {
    this.quickCustomer = this.emptyQuickCustomer();
    this.customerModalOpen.set(true);
  }

  closeQuickCustomer() {
    this.customerModalOpen.set(false);
  }

  onQuickDocumentTypeChange() {
    if (this.quickCustomer.documentType === 'CC') {
      this.quickCustomer.city = this.quickCustomer.city || 'Medellín';
      this.quickCustomer.department = this.quickCustomer.department || 'Antioquia';
    }
  }

  saveQuickCustomer() {
    this.onQuickDocumentTypeChange();
    if (!this.quickCustomer.name.trim() || !this.quickCustomer.documentNumber.trim()) {
      alert('Nombre y documento son obligatorios.');
      return;
    }
    if (this.quickCustomer.documentType === 'NIT' && (!this.quickCustomer.address.trim() || !this.quickCustomer.city.trim())) {
      alert('Dirección y ciudad son obligatorias para NIT.');
      return;
    }

    this.customersService.createCustomer({
      name: this.quickCustomer.name.trim(),
      documentNumber: this.quickCustomer.documentNumber.trim(),
      documentType: this.quickCustomer.documentType,
      address: this.quickCustomer.address.trim() || undefined,
      city: this.quickCustomer.city.trim() || 'Medellín',
      department: this.quickCustomer.department.trim() || 'Antioquia',
      phone: this.quickCustomer.phone.trim() || undefined,
      email: this.quickCustomer.email.trim() || undefined
    }).subscribe({
      next: customer => {
        this.selectedCustomer.set(customer);
        this.closeQuickCustomer();
      },
      error: error => alert(error.error?.message || 'No fue posible crear el cliente.')
    });
  }

  private emptyQuickCustomer(): QuickCustomerForm {
    return { name: '', documentNumber: '', documentType: 'CC', address: '', city: 'Medellín', department: 'Antioquia', phone: '', email: '' };
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
      currentCart.push({ product, quantity: 1, sectionId: this.selectedSectionId(), employeeId: null });
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
    if (!customer || this.processingSale()) return;

    const pendingEmployees = this.cart().filter(item => this.requiresEmployee(item.product) && !item.employeeId);
    if (pendingEmployees.length > 0) {
      alert(`Asigna un técnico responsable para: ${pendingEmployees.map(item => item.product.name).join(', ')}.`);
      return;
    }

    const receivedAmount = this.paymentMethod === 'CASH' && this.cashReceived && this.cashReceived > 0
      ? this.cashReceived
      : null;

    if (receivedAmount !== null && receivedAmount < this.cartTotal()) {
      alert('El efectivo recibido es menor al total a pagar.');
      return;
    }

    const orderDto: CreateOrderDto = {
      userId: 1,
      customerId: customer.customerId,
      sectionId: this.selectedSectionId(),
      paymentMethod: this.paymentMethod,
      receivedAmount,
      invoiceType: this.invoiceType,
      details: this.cart().map(item => ({
        productId: item.product.productId,
        sectionId: item.sectionId,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
        employeeId: item.employeeId ?? null
      }))
    };

    this.processingSale.set(true);

    this.posService.processSale(orderDto).subscribe({
      next: (res) => {
        this.processingSale.set(false);
        this.cart.set([]);
        this.selectedCustomer.set(null);
        this.cashReceived = null;
        // POS-05: se abre automáticamente la vista previa del recibo de la venta.
        this.openReceipt(res.orderId);
      },
      error: (err) => {
        this.processingSale.set(false);
        alert(`Error al cobrar: ${err.error?.message || err.message}`);
      }
    });
  }
}