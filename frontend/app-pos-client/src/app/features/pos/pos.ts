import { Component, effect, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { PosService, Section } from './services/pos.service';
import { AuthService } from '../../core/auth/auth.service';
import { CartItem, Product, Customer, CreateOrderDto, Employee } from '../../shared/models/pos.models';
import { CustomersService } from '../customers/services/customers.service';
import { EmployeesService } from '../employees/services/employees.service';
import { ReceiptComponent } from '../../shared/components/receipt/receipt';
import { ReceiptData } from '../../shared/models/receipt.models';
import { buildReceiptData } from '../../shared/utils/receipt.mapper';
import { productImageSrc } from '../../shared/utils/product-image';
import {
  InvoiceType,
  applicableTaxPercentage,
  electronicInvoiceCustomerError,
  groupTaxes,
  lineTaxAmount,
  normalizePlate,
  roundMoney,
  taxLabel
} from '../../shared/utils/invoice-tax';

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
        <!--
          POS-07: filas de alto fijo (12 por página = 6×2 / 4×3 / 3×4 según el ancho).
          Las filas se reservan aunque la página tenga menos productos, así las tarjetas
          de la última página miden lo mismo que en una página llena (no se estiran).
        -->
        <div class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 grid-rows-[repeat(6,minmax(13rem,1fr))] md:grid-rows-[repeat(4,minmax(13rem,1fr))] lg:grid-rows-[repeat(3,minmax(13rem,1fr))]">
          @for (product of pagedProducts(); track product.productId) {
            <div
              (click)="addToCart(product)"
              class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all cursor-pointer flex flex-col justify-between group min-h-0">
              <!-- POS-07: imagen del producto (ocupa el alto libre de la tarjeta) -->
              <div class="mb-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                @if (imageSrc(product); as src) {
                  <img [src]="src" [alt]="product.name" loading="lazy" (error)="onImageError(product.productId)" class="h-full w-full object-contain" />
                } @else {
                  <svg class="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Zm10.5-11.25h.008v.008h-.008V9.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                }
              </div>
              <h3 class="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">{{ product.name }}</h3>
              <!-- POS-07: el SKU reemplaza la etiqueta "Precio" para dejarle más alto a la imagen -->
              <div class="mt-2 flex justify-between items-end gap-2 border-t border-slate-100 pt-2">
                <span class="min-w-0 truncate font-mono text-xs text-slate-400" [title]="'SKU: ' + product.sku">{{ product.sku }}</span>
                @if (product.isOpenItem) {
                  <!-- leading-6 = mismo alto de línea que el precio (text-base) para que el separador quede alineado -->
                  <span class="shrink-0 text-sm font-bold leading-6 text-amber-600">Precio libre</span>
                } @else {
                  <span class="shrink-0 text-base font-extrabold text-emerald-600">\${{ product.salePrice | number:'1.2-2' }}</span>
                }
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-12 text-slate-400 text-sm">
              No hay productos registrados en esta tienda.
            </div>
          }
        </div>

        <!-- POS-07: paginación del catálogo (12 productos por página) -->
        @if (totalPages() > 1) {
          <nav class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm" aria-label="Paginación de productos">
            <span class="text-xs text-slate-500">
              Mostrando <strong class="text-slate-700">{{ pageRangeStart() }}–{{ pageRangeEnd() }}</strong> de {{ filteredProducts().length }} productos
            </span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                (click)="goToPage(currentPage() - 1)"
                [disabled]="currentPage() === 1"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-600">
                ‹ Anterior
              </button>
              @for (page of pageNumbers(); track page) {
                <button
                  type="button"
                  (click)="goToPage(page)"
                  [attr.aria-current]="page === currentPage() ? 'page' : null"
                  [class]="page === currentPage()
                    ? 'min-w-8 rounded-lg border border-indigo-600 bg-indigo-600 px-2 py-1.5 text-xs font-bold text-white shadow-sm'
                    : 'min-w-8 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white'">
                  {{ page }}
                </button>
              }
              <button
                type="button"
                (click)="goToPage(currentPage() + 1)"
                [disabled]="currentPage() === totalPages()"
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-white disabled:hover:text-slate-600">
                Siguiente ›
              </button>
            </div>
          </nav>
        }
      </div>

      <!-- PANEL DERECHO: Carrito Aislado y Cobro -->
      <div class="w-96 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
        
        <!--
          INV-01: placa + "a nombre de" en texto libre. No hace falta que el cliente esté en Clientes
          (ahí sólo van los frecuentes): al escribir el nombre se sugieren los guardados.
        -->
        <div class="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl relative">
          <div class="grid grid-cols-[6.5rem_1fr] gap-2">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500">Placa
              <input
                type="text"
                [ngModel]="vehiclePlate()"
                (ngModelChange)="vehiclePlate.set(normalizePlate($event))"
                maxlength="10"
                placeholder="ABC123"
                aria-label="Placa del vehículo (opcional)"
                class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-300 focus:border-indigo-500" />
            </label>

            <div class="block min-w-0 text-xs font-bold uppercase tracking-wider text-slate-500">A nombre de
              @if (!selectedCustomer()) {
                <div class="relative mt-1">
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [ngModel]="customerName()"
                      (ngModelChange)="onCustomerNameInput($event)"
                      maxlength="100"
                      placeholder="Consumidor final"
                      aria-label="A nombre de quién sale la factura"
                      class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-500" />
                    <button type="button" (click)="openQuickCustomer()" class="w-9 rounded-lg bg-slate-900 text-lg font-bold text-white transition-colors hover:bg-indigo-600" title="Guardar un cliente frecuente" aria-label="Crear cliente frecuente">+</button>
                  </div>

              <!-- Desplegable de clientes frecuentes guardados -->
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
                    </div>
                  }
                </div>
              }
                </div>
              } @else {
                <!-- Cliente frecuente seleccionado -->
                <div class="mt-1 flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold normal-case tracking-normal text-indigo-700">
                  <div class="min-w-0">
                    <span class="block truncate font-bold text-indigo-900">{{ selectedCustomer()?.name }}</span>
                    <span class="font-normal text-indigo-500">Doc: {{ selectedCustomer()?.documentNumber }}</span>
                  </div>
                  <button type="button" (click)="removeCustomer()" class="p-1 font-bold text-slate-400 hover:text-red-500" aria-label="Quitar cliente">✕</button>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Lista del Carrito -->
        <div class="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          @for (item of cart(); track item.lineId; let i = $index) {
            <div class="py-3 flex justify-between items-center gap-2">
              <div class="flex-1">
                <h4 class="font-medium text-slate-800 text-sm">{{ item.description || item.product.name }} @if (item.product.isOpenItem) { <span class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Otros</span> } @else if (item.product.isService) { <span class="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">Servicio</span> }</h4>
                <!-- POS-07: precio unitario (ámbar si se cambió) + ↺ para volver al precio original -->
                <div class="flex items-center gap-1">
                  <span class="text-xs" [class.text-slate-400]="!isPriceChanged(item)" [class.font-semibold]="isPriceChanged(item)" [class.text-amber-600]="isPriceChanged(item)">\${{ (item.unitPrice ?? 0) | number:'1.0-0' }} c/u</span>
                  @if (item.product.isOpenItem && item.unitCost) {
                    <span class="text-xs text-slate-400">· costo \${{ item.unitCost | number:'1.0-0' }}</span>
                  }
                  <!-- INV-01: en factura electrónica se indica el impuesto que se suma a la línea -->
                  @if (lineTaxPercentage(item) > 0) {
                    <span class="rounded bg-sky-50 px-1 text-[10px] font-bold text-sky-700" [title]="'Se suma ' + lineTaxLabel(item) + ' al total'">+ {{ lineTaxLabel(item) }}</span>
                  }
                  @if (isPriceChanged(item)) {
                    <button
                      type="button"
                      (click)="resetUnitPrice(i)"
                      class="rounded px-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                      [title]="'Volver al precio original ($' + (item.product.salePrice | number:'1.0-0') + ')'"
                      [attr.aria-label]="'Volver al precio original de ' + item.product.name">↺</button>
                  }
                </div>
                @if (priceError(item); as error) {
                  <p class="mt-0.5 text-[11px] font-bold text-red-600">{{ error }}</p>
                }
                @if (requiresEmployee(item.product)) {
                  <!-- POS-07: appearance-none quita el botón nativo de Windows (recuadro gris al hacer hover); flecha propia en SVG -->
                  <select [(ngModel)]="item.employeeId" [attr.aria-label]="'Técnico responsable de ' + (item.description || item.product.name)" class="select-chevron mt-1 w-full cursor-pointer appearance-none truncate rounded-lg border border-slate-300 bg-white py-1 pl-2 pr-7 text-xs text-slate-700 outline-none transition-colors hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500">
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
              <!-- POS-07: total de la línea; clic para editar el PRECIO UNITARIO en el mismo lugar -->
              @if (editingPriceIndex() === i) {
                <div class="flex w-24 shrink-0 flex-col items-end">
                  <input
                    #priceInput
                    [id]="'price-edit-' + i"
                    type="number"
                    min="1"
                    step="any"
                    [value]="item.unitPrice ?? ''"
                    (keydown.enter)="commitPriceEdit(i, priceInput.value)"
                    (keydown.escape)="cancelPriceEdit()"
                    (blur)="commitPriceEdit(i, priceInput.value)"
                    [attr.aria-label]="'Precio unitario de ' + item.product.name"
                    class="w-24 rounded-md border border-indigo-400 px-2 py-0.5 text-right text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span class="text-[10px] text-slate-400">precio c/u</span>
                </div>
              } @else {
                <button
                  type="button"
                  (click)="startPriceEdit(i)"
                  title="Clic para cambiar el precio unitario"
                  class="w-24 shrink-0 rounded-md px-1 py-0.5 text-right text-sm font-bold transition-colors hover:bg-slate-100"
                  [class.text-slate-700]="!isPriceChanged(item) && isPriceValid(item)"
                  [class.text-amber-600]="isPriceChanged(item) && isPriceValid(item)"
                  [class.text-red-600]="!isPriceValid(item)">
                  \${{ item.quantity * (item.unitPrice ?? 0) | number:'1.2-2' }}
                </button>
              }
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
              type="button"
              (click)="setInvoiceType('POS')"
              [attr.aria-pressed]="invoiceType() === 'POS'"
              [class]="toggleButtonClass(invoiceType() === 'POS', 'text-xs')">
              Factura de venta
            </button>
            <button
              type="button"
              (click)="setInvoiceType('ELECTRONIC')"
              [attr.aria-pressed]="invoiceType() === 'ELECTRONIC'"
              [class]="toggleButtonClass(invoiceType() === 'ELECTRONIC', 'text-xs')">
              Factura Electrónica
            </button>
          </div>

          <!-- INV-01: la factura electrónica exige un cliente identificado y con correo -->
          @if (electronicCustomerError(); as customerError) {
            <p class="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-snug text-amber-700 ring-1 ring-amber-200" role="alert">{{ customerError }}</p>
          }

          <div class="space-y-1 pt-2 border-t border-slate-200 text-sm">
            <div class="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>\${{ cartSubtotal() | number:'1.2-2' }}</span>
            </div>
            <!-- INV-01: desglose del impuesto sólo en factura electrónica -->
            @if (invoiceType() === 'ELECTRONIC') {
              @for (tax of cartTaxBreakdown(); track tax.label) {
                <div class="flex justify-between text-slate-500">
                  <span>{{ tax.label }} <span class="text-[11px] text-slate-400">(base \${{ tax.base | number:'1.0-0' }})</span></span>
                  <span>\${{ tax.amount | number:'1.2-2' }}</span>
                </div>
              } @empty {
                <div class="flex justify-between text-slate-400">
                  <span>IVA / Impuestos</span>
                  <span>\$0.00</span>
                </div>
              }
            }
            <div class="flex justify-between text-lg font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Pagar</span>
              <span class="text-emerald-600">\${{ cartTotal() | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- POS-07: un solo motivo por venta, visible sólo si algún precio se cambió -->
          @if (hasPriceChanges()) {
            <input
              [(ngModel)]="priceChangeReason"
              maxlength="200"
              [placeholder]="priceReasonRequired() ? 'Motivo del ajuste de precio (obligatorio)' : 'Motivo del ajuste de precio (opcional)'"
              [required]="priceReasonRequired()"
              aria-label="Motivo del ajuste de precio"
              class="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-slate-700 outline-none placeholder:text-amber-700/60 focus:ring-2 focus:ring-indigo-500"
            />
          }

          <!-- POS-05: método de pago y efectivo recibido (se imprimen en el recibo) -->
          <div class="space-y-2 pt-2 border-t border-slate-200">
            <div class="flex gap-1.5">
              <button
                type="button"
                (click)="setPaymentMethod('CASH')"
                [attr.aria-pressed]="paymentMethod === 'CASH'"
                [class]="toggleButtonClass(paymentMethod === 'CASH', 'text-[11px]')">
                Efectivo
              </button>
              <button
                type="button"
                (click)="setPaymentMethod('TRANSFER')"
                [attr.aria-pressed]="paymentMethod === 'TRANSFER'"
                [class]="toggleButtonClass(paymentMethod === 'TRANSFER', 'text-[11px]')">
                Transferencia
              </button>
              <button
                type="button"
                (click)="setPaymentMethod('CREDIT')"
                [attr.aria-pressed]="paymentMethod === 'CREDIT'"
                [class]="toggleButtonClass(paymentMethod === 'CREDIT', 'text-[11px]')">
                Pendiente
              </button>
            </div>

            @if (paymentMethod === 'CREDIT') {
              <p class="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-snug text-amber-700 ring-1 ring-amber-200">
                Venta a crédito: queda <span class="uppercase">pendiente de pago</span> y el inventario se descuenta igual.
              </p>
            }

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
            [disabled]="cart().length === 0 || processingSale() || !!electronicCustomerError() || (paymentMethod === 'CASH' && cashReceived !== null && cashDifference < 0)"
            (click)="checkout()"
            class="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg transition-all text-center">
            {{ processingSale() ? 'Procesando venta...' : 'Procesar Venta' }}
          </button>
        </div>
      </div>

      <!-- POS-07: ítem abierto "Otros" -->
      @if (otherItemProduct(); as other) {
        <div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeOtherItem()"></div>
        <section class="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-md -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="other-item-title" (keydown.escape)="closeOtherItem()">
          <div class="flex items-start justify-between border-b pb-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-amber-600">{{ other.name }}</p>
              <h3 id="other-item-title" class="text-lg font-black text-slate-900">Agregar artículo</h3>
              <p class="text-xs text-slate-500">Repuestos no inventariados, sobrantes o ventas ocasionales.</p>
            </div>
            <button type="button" (click)="closeOtherItem()" class="text-2xl text-slate-400 hover:text-slate-700" aria-label="Cerrar">&times;</button>
          </div>
          <form class="space-y-3 pt-4" (ngSubmit)="confirmOtherItem()">
            <label class="block text-xs font-bold uppercase text-slate-600">Descripción *
              <input id="other-item-description" name="otherDescription" [(ngModel)]="otherItem.description" maxlength="150" placeholder="Ej. Bombillo H4" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case outline-none focus:ring-2 focus:ring-indigo-500" />
            </label>
            <div class="grid grid-cols-3 gap-2">
              <label class="col-span-1 block text-xs font-bold uppercase text-slate-600">Precio c/u *
                <input name="otherPrice" [(ngModel)]="otherItem.price" type="number" min="1" step="any" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label class="col-span-1 block text-xs font-bold uppercase text-slate-600">Costo c/u
                <input name="otherCost" [(ngModel)]="otherItem.cost" type="number" min="0" step="any" placeholder="0" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label class="col-span-1 block text-xs font-bold uppercase text-slate-600">Cantidad
                <input name="otherQuantity" [(ngModel)]="otherItem.quantity" type="number" min="1" step="1" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
            </div>
            <p class="text-xs text-slate-400">El costo es opcional: si lo conoces, la ganancia se calcula real; si no, se toma $0.</p>
            @if (otherItemError()) { <p class="text-xs font-bold text-red-600">{{ otherItemError() }}</p> }
            <div class="flex justify-end gap-2 border-t pt-3">
              <button type="button" (click)="closeOtherItem()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button type="submit" class="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">Agregar al carrito</button>
            </div>
          </form>
        </section>
      }

      @if (customerModalOpen()) {<div class="fixed inset-0 z-40 bg-slate-950/50" (click)="closeQuickCustomer()"></div><section class="fixed inset-4 z-50 m-auto max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div class="flex justify-between border-b pb-4"><h3 class="text-xl font-black">Nuevo cliente</h3><button (click)="closeQuickCustomer()" class="text-2xl text-slate-400">&times;</button></div><div class="grid gap-3 py-5 md:grid-cols-2"><label class="text-xs font-bold uppercase">Nombre *<input [(ngModel)]="quickCustomer.name" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Tipo documento *<select [(ngModel)]="quickCustomer.documentType" (ngModelChange)="onQuickDocumentTypeChange()" class="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"><option value="CC">Cédula de Ciudadanía</option><option value="NIT">NIT</option><option value="CE">Cédula de Extranjería</option><option value="PASSPORT">Pasaporte</option></select></label><label class="text-xs font-bold uppercase">Número documento *<input [(ngModel)]="quickCustomer.documentNumber" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Teléfono<input [(ngModel)]="quickCustomer.phone" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Dirección<input [(ngModel)]="quickCustomer.address" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Ciudad<input [(ngModel)]="quickCustomer.city" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Departamento<input [(ngModel)]="quickCustomer.department" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label><label class="text-xs font-bold uppercase">Correo<input [(ngModel)]="quickCustomer.email" type="email" class="mt-1 w-full rounded border px-3 py-2 text-sm" /></label></div><div class="flex justify-end gap-2 border-t pt-4"><button (click)="closeQuickCustomer()" class="rounded border px-4 py-2 text-sm font-bold">Cancelar</button><button (click)="saveQuickCustomer()" class="rounded bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-bold text-white">Guardar cliente</button></div></section>}

      @if (receiptData(); as receipt) {
        <app-receipt [data]="receipt" [success]="saleCompleted()" (closed)="closeReceipt()"></app-receipt>
      }
    </div>
  `
})
export class PosComponent implements OnInit {
  private posService = inject(PosService);
  private auth = inject(AuthService);
  private customersService = inject(CustomersService);
  private employeesService = inject(EmployeesService);

  sections = signal<Section[]>([]);
  selectedSectionId = signal<number>(1);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  employees = signal<Employee[]>([]);
  
  cart = this.posService.cartItems;
  
  // Cliente & Búsqueda reactiva
  /** Cliente frecuente elegido de Clientes (opcional). */
  selectedCustomer = signal<Customer | null>(null);
  /** INV-01: "a nombre de" escrito a mano cuando no se elige un cliente guardado. */
  readonly customerName = signal('');
  /** INV-01: placa del vehículo (opcional), ya normalizada. */
  readonly vehiclePlate = signal('');
  readonly normalizePlate = normalizePlate;
  customerSearchResults = signal<Customer[]>([]);
  private customerSearchSubject = new Subject<string>();
  customerModalOpen = signal(false);
  quickCustomer: QuickCustomerForm = this.emptyQuickCustomer();

  searchQuery = '';
  /** INV-01: signal para que los totales (con o sin IVA) se recalculen al cambiar el tipo de factura. */
  readonly invoiceType = signal<InvoiceType>('POS');

  // POS-05: cobro en efectivo/transferencia y recibo impreso
  // POS-06: 'CREDIT' registra la venta como pendiente de pago (sin monto recibido)
  paymentMethod: 'CASH' | 'TRANSFER' | 'CREDIT' = 'CASH';
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

  /** Suma de precios sin impuesto (base). */
  cartSubtotal = computed(() => {
    return this.cart().reduce((acc, item) => acc + this.lineBase(item), 0);
  });

  /**
   * INV-01: desglose del impuesto por tarifa. Sólo hay impuesto en factura electrónica
   * (misma regla y redondeo que el servidor); en factura de venta queda vacío.
   */
  cartTaxBreakdown = computed(() => {
    const invoiceType = this.invoiceType();
    return groupTaxes(this.cart().map(item => {
      const percentage = applicableTaxPercentage(invoiceType, item.product);
      const base = this.lineBase(item);
      return { label: taxLabel(item.product.tax?.name, percentage), percentage, base, amount: lineTaxAmount(base, percentage) };
    }));
  });

  cartTax = computed(() => roundMoney(this.cartTaxBreakdown().reduce((acc, tax) => acc + tax.amount, 0)));

  /** Total a pagar: base + impuesto (el impuesto sólo existe en factura electrónica). */
  cartTotal = computed(() => roundMoney(this.cartSubtotal() + this.cartTax()));

  /** INV-01: motivo por el que no se puede emitir la factura electrónica con el cliente actual. */
  electronicCustomerError = computed(() => {
    if (this.invoiceType() !== 'ELECTRONIC' || this.cart().length === 0) return null;
    return electronicInvoiceCustomerError(this.selectedCustomer()?.name ?? this.customerName());
  });

  setInvoiceType(type: InvoiceType): void {
    this.invoiceType.set(type);
  }

  lineTaxPercentage(item: CartItem): number {
    return applicableTaxPercentage(this.invoiceType(), item.product);
  }

  lineTaxLabel(item: CartItem): string {
    return taxLabel(item.product.tax?.name, this.lineTaxPercentage(item));
  }

  private lineBase(item: CartItem): number {
    return (item.unitPrice ?? 0) * item.quantity;
  }

  /** Diferencia entre el efectivo recibido y el total (negativa = falta dinero). */
  get cashDifference(): number {
    return (this.cashReceived ?? 0) - this.cartTotal();
  }

  /**
   * POS-07: clases de los botones de selección (tipo de factura / método de pago).
   * Mismo estilo que el selector de unidad de negocio del layout: el activo en azul (indigo).
   * Se arma un solo juego de colores por estado para que `bg-white` no pise al activo.
   */
  toggleButtonClass(active: boolean, textSize: string): string {
    const base = `flex-1 rounded-lg border py-1.5 font-bold transition-colors ${textSize}`;
    return active
      ? `${base} border-indigo-600 bg-indigo-600 text-white shadow-sm`
      : `${base} border-slate-300 bg-white text-slate-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white`;
  }

  setPaymentMethod(method: 'CASH' | 'TRANSFER' | 'CREDIT'): void {
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
    // POS-07: "Otros" (repuestos/sobrantes) no exige técnico, salvo que se le configure comisión.
    if (product.isOpenItem) return product.employeeCommissionPercentage > 0;
    return product.isService || product.employeeCommissionPercentage > 0;
  }

  // Pipeline RxJS con debounce (300ms) para búsqueda fluida en tiempo real
  private setupCustomerSearchPipeline() {
    this.customerSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        // Se sugieren clientes guardados a partir de 2 letras/dígitos.
        if (query.trim().length < 2) return of([]);
        return this.posService.searchCustomers(query);
      })
    ).subscribe({
      next: (results) => this.customerSearchResults.set(results),
      error: () => this.customerSearchResults.set([])
    });
  }

  /** INV-01: el nombre escrito se guarda tal cual y además busca clientes frecuentes. */
  onCustomerNameInput(value: string) {
    this.customerName.set(value ?? '');
    this.customerSearchSubject.next(value ?? '');
  }

  selectCustomer(customer: Customer) {
    this.selectedCustomer.set(customer);
    this.customerSearchResults.set([]);
    this.customerName.set('');
  }

  removeCustomer() {
    this.selectedCustomer.set(null);
  }

  private resetSaleCustomer(): void {
    this.selectedCustomer.set(null);
    this.customerName.set('');
    this.vehiclePlate.set('');
    this.customerSearchResults.set([]);
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
        this.currentPage.set(1);
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
    // Cada búsqueda vuelve a la primera página de resultados.
    this.currentPage.set(1);
  }

  // ---- POS-07: paginación del catálogo ----
  readonly pageSize = 12;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize)));

  readonly pagedProducts = computed(() => {
    // Si la lista se encoge (búsqueda, cambio de unidad) nunca se queda en una página vacía.
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  readonly pageRangeStart = computed(() =>
    this.filteredProducts().length === 0 ? 0 : (Math.min(this.currentPage(), this.totalPages()) - 1) * this.pageSize + 1
  );

  readonly pageRangeEnd = computed(() =>
    Math.min(this.pageRangeStart() + this.pageSize - 1, this.filteredProducts().length)
  );

  /** Números de página visibles: todos si son pocos; si no, una ventana de 5 alrededor de la actual. */
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const windowSize = 5;
    let start = Math.max(1, this.currentPage() - Math.floor(windowSize / 2));
    const end = Math.min(total, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });

  /** Productos cuya imagen falló al cargar (archivo borrado, ruta inválida): se muestra el placeholder. */
  private readonly brokenImageIds = signal<ReadonlySet<number>>(new Set());

  imageSrc(product: Product): string | null {
    if (this.brokenImageIds().has(product.productId)) return null;
    return productImageSrc(product.imageUrl);
  }

  onImageError(productId: number): void {
    this.brokenImageIds.update(ids => new Set(ids).add(productId));
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  addToCart(product: Product) {
    // POS-07: "Otros" pide descripción, precio y costo antes de agregarse.
    if (product.isOpenItem) {
      this.openOtherItem(product);
      return;
    }

    const currentCart = [...this.cart()];
    const index = currentCart.findIndex(item => item.product.productId === product.productId && !item.description);

    if (index > -1) {
      currentCart[index].quantity += 1;
    } else {
      currentCart.push({ lineId: this.newLineId(), product, quantity: 1, sectionId: this.selectedSectionId(), employeeId: null, unitPrice: product.salePrice });
    }

    this.cart.set(currentCart);
  }

  private lineSequence = 0;
  private newLineId(): string {
    return `line-${Date.now()}-${++this.lineSequence}`;
  }

  // ---- POS-07: ítem abierto "Otros" (repuestos no inventariados, sobrantes, ventas ocasionales) ----

  readonly otherItemProduct = signal<Product | null>(null);
  otherItem = { description: '', price: null as number | null, cost: null as number | null, quantity: 1 };
  readonly otherItemError = signal('');

  openOtherItem(product: Product): void {
    this.otherItem = { description: '', price: null, cost: null, quantity: 1 };
    this.otherItemError.set('');
    this.otherItemProduct.set(product);
    setTimeout(() => document.getElementById('other-item-description')?.focus());
  }

  closeOtherItem(): void {
    this.otherItemProduct.set(null);
  }

  confirmOtherItem(): void {
    const product = this.otherItemProduct();
    if (!product) return;

    const description = this.otherItem.description.trim();
    const price = Number(this.otherItem.price);
    const cost = this.otherItem.cost === null || (this.otherItem.cost as unknown) === '' ? 0 : Number(this.otherItem.cost);
    const quantity = Math.floor(Number(this.otherItem.quantity));

    if (!description) return this.otherItemError.set('Escribe qué se está vendiendo.');
    if (!price || price <= 0) return this.otherItemError.set('El precio debe ser mayor a 0.');
    if (Number.isNaN(cost) || cost < 0) return this.otherItemError.set('El costo no puede ser negativo.');
    if (price < cost) return this.otherItemError.set(`El precio no puede ser menor al costo ($${this.formatPrice(cost)}).`);
    if (!quantity || quantity < 1) return this.otherItemError.set('La cantidad debe ser al menos 1.');

    this.cart.update(items => [...items, {
      lineId: this.newLineId(),
      product,
      description,
      unitCost: cost,
      quantity,
      sectionId: this.selectedSectionId(),
      employeeId: null,
      unitPrice: price
    }]);
    this.closeOtherItem();
  }

  // ---- POS-07: precio editable por línea ----
  // El servidor congela el precio de lista y el cobrado (OrderDetails.list_price / unit_price),
  // así que reportes, comisiones y ganancias usan siempre lo que realmente se cobró.

  setUnitPrice(index: number, value: number | string | null): void {
    const parsed = value === null || value === '' ? null : Number(value);
    const price = parsed === null || Number.isNaN(parsed) ? null : parsed;
    // Se crea un arreglo nuevo para que cartTotal() (computed) se recalcule.
    this.cart.update(items => items.map((item, i) => i === index ? { ...item, unitPrice: price } : item));
  }

  resetUnitPrice(index: number): void {
    this.cart.update(items => items.map((item, i) => i === index ? { ...item, unitPrice: item.product.salePrice } : item));
  }

  /** Línea cuyo precio se está editando (clic en el total de la derecha). */
  readonly editingPriceIndex = signal<number | null>(null);

  /** Motivo único del ajuste de precio para toda la venta (SEC-01: obligatorio para el cajero). */
  priceChangeReason = '';

  readonly hasPriceChanges = computed(() => this.cart().some(item => this.isPriceChanged(item)));

  /** SEC-01: el cajero puede cambiar precios, pero siempre con motivo (el administrador, opcional). */
  readonly priceReasonRequired = computed(() => !this.auth.isAdmin());

  startPriceEdit(index: number): void {
    this.editingPriceIndex.set(index);
    // El input se crea en el siguiente ciclo de render: enfocar y seleccionar para escribir directo.
    setTimeout(() => {
      const input = document.getElementById(`price-edit-${index}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  commitPriceEdit(index: number, value: string): void {
    // Enter y blur pueden dispararse ambos: sólo se confirma una vez (y nunca tras Esc).
    if (this.editingPriceIndex() !== index) return;
    this.editingPriceIndex.set(null);
    this.setUnitPrice(index, value);
  }

  cancelPriceEdit(): void {
    this.editingPriceIndex.set(null);
  }

  isPriceChanged(item: CartItem): boolean {
    // Los ítems "Otros" no tienen precio original: su precio siempre es el escrito.
    if (item.product.isOpenItem) return false;
    return item.unitPrice !== null && Math.round(item.unitPrice * 100) !== Math.round(item.product.salePrice * 100);
  }

  /**
   * Error del precio de la línea o null si es válido. Misma regla que el servidor:
   * mayor a 0 y, si se cambió, nunca menor al costo (igual al costo sí se permite).
   */
  priceError(item: CartItem): string | null {
    if (item.unitPrice === null || item.unitPrice <= 0) return 'El precio debe ser mayor a 0.';
    if (item.product.isOpenItem) {
      const cost = item.unitCost ?? 0;
      return item.unitPrice < cost ? `No puede ser menor al costo ($${this.formatPrice(cost)}).` : null;
    }
    if (this.isPriceChanged(item) && item.unitPrice < item.product.purchasePrice) {
      return `No puede ser menor al costo ($${this.formatPrice(item.product.purchasePrice)}).`;
    }
    return null;
  }

  isPriceValid(item: CartItem): boolean {
    return this.priceError(item) === null;
  }

  private formatPrice(value: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  }

  updateQuantity(index: number, change: number) {
    this.cancelPriceEdit();
    const currentCart = [...this.cart()];
    currentCart[index].quantity += change;

    if (currentCart[index].quantity <= 0) {
      currentCart.splice(index, 1);
    }

    this.cart.set(currentCart);
  }

  checkout() {
    const customer = this.selectedCustomer();
    if (this.processingSale()) return;

    const pendingEmployees = this.cart().filter(item => this.requiresEmployee(item.product) && !item.employeeId);
    if (pendingEmployees.length > 0) {
      alert(`Asigna un técnico responsable para: ${pendingEmployees.map(item => item.product.name).join(', ')}.`);
      return;
    }

    const customerError = this.electronicCustomerError();
    if (customerError) {
      alert(customerError);
      return;
    }

    const invalidPrices = this.cart().filter(item => !this.isPriceValid(item));
    if (invalidPrices.length > 0) {
      alert(`Revisa el precio de:\n${invalidPrices.map(item => `• ${item.product.name}: ${this.priceError(item)}`).join('\n')}`);
      return;
    }

    if (this.hasPriceChanges() && this.priceReasonRequired() && !this.priceChangeReason.trim()) {
      alert('Escribe el motivo del ajuste de precio antes de cobrar.');
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
      // INV-01: cliente frecuente (con su documento) o, si no, "Consumidor Final" con el nombre escrito.
      customerId: customer?.customerId ?? null,
      customerName: customer ? null : (this.customerName().trim() || null),
      vehiclePlate: this.vehiclePlate() || null,
      sectionId: this.selectedSectionId(),
      paymentMethod: this.paymentMethod,
      receivedAmount,
      invoiceType: this.invoiceType(),
      details: this.cart().map(item => ({
        productId: item.product.productId,
        sectionId: item.sectionId,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
        employeeId: item.employeeId ?? null,
        // POS-07: sólo se envía si el cajero cambió el precio; si no, el servidor usa el de catálogo.
        priceOverride: item.product.isOpenItem || this.isPriceChanged(item) ? item.unitPrice : null,
        // POS-07: ítems "Otros": qué se vendió y su costo.
        description: item.product.isOpenItem ? item.description ?? null : null,
        unitCost: item.product.isOpenItem ? item.unitCost ?? 0 : null
      })),
      priceChangeReason: this.hasPriceChanges() ? (this.priceChangeReason.trim() || null) : null
    };

    this.processingSale.set(true);

    this.posService.processSale(orderDto).subscribe({
      next: (res) => {
        this.processingSale.set(false);
        this.cart.set([]);
        this.priceChangeReason = '';
        this.editingPriceIndex.set(null);
        this.resetSaleCustomer();
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