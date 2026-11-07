import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PosService, Section } from '../../../features/pos/services/pos.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-slate-100 font-sans">
      <!-- Sidebar -->
      <aside class="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        <div class="p-5 text-xl font-bold text-white tracking-wider flex items-center gap-2 border-b border-slate-800">
          <span class="p-2 bg-indigo-600 rounded-lg text-sm">POS</span>
          <span>AppPOS</span>
        </div>
        
        <nav class="flex-1 p-4 space-y-1">
          <a routerLink="/dashboard" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 13h4v8H3v-8zM10 3h4v18h-4V3zM17 9h4v12h-4V9z"/>
            </svg>
            Dashboard
          </a>

          <a routerLink="/pos" routerLinkActive="bg-indigo-600 text-white" 
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            Punto de Venta (POS)
          </a>

          <a routerLink="/sales-history" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h6m-6 4h4"/>
            </svg>
            Historial de ventas
          </a>

          <a routerLink="/products" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
            </svg>
            Productos
          </a>

          <a routerLink="/inventory" routerLinkActive="bg-indigo-600 text-white" 
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Inventario & Stock
          </a>

          <a routerLink="/purchases" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            Compras
          </a>

          <a routerLink="/employees" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Empleados
          </a>

          <a routerLink="/customers" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m8-8a4 4 0 100-8 4 4 0 000 8zm6-3a4 4 0 100-8m0 8a4 4 0 014 4v2"/>
            </svg>
            Clientes
          </a>

          <a routerLink="/suppliers" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h2m10 0h2"/>
            </svg>
            Proveedores
          </a>

          <!-- EXP-01: gastos del negocio y personales / familiares -->
          <a routerLink="/expenses" routerLinkActive="bg-indigo-600 text-white"
             class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-slate-800 hover:text-white font-medium">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/>
            </svg>
            Gastos
          </a>
        </nav>

        <div class="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          AppPOS System v1.0
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Topbar -->
        <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm">
          <h1 class="text-lg font-semibold text-slate-800">Caja Registradora Principal</h1>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <span class="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Unidad de negocio</span>
              @for (section of sections(); track section.sectionId) {
                <button (click)="selectSection(section.sectionId)" [class.bg-indigo-600]="selectedSectionId() === section.sectionId" [class.text-white]="selectedSectionId() === section.sectionId" class="rounded-md px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-indigo-500 hover:text-white">
                  {{ section.name }}
                </button>
              }
            </div>
            <span class="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span class="text-sm font-medium text-slate-600">Cajero: Admin</span>
          </div>
        </header>

        <!-- Dynamic View -->
        <div class="flex-1 overflow-auto bg-slate-50">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class LayoutComponent implements OnInit {
  private readonly posService = inject(PosService);

  sections = signal<Section[]>([]);
  selectedSectionId = this.posService.selectedSectionId;

  ngOnInit(): void {
    this.posService.getSections().subscribe({
      next: sections => {
        this.sections.set(sections);
        if (!this.selectedSectionId() && sections.length > 0) {
          this.selectedSectionId.set(sections[0].sectionId);
        }
      }
    });
  }

  selectSection(sectionId: number): void {
    if (sectionId === this.selectedSectionId()) return;

    if (this.posService.cartItems().length > 0) {
      const confirmSwitch = confirm('Al cambiar de unidad se vaciará el carrito actual. ¿Deseas continuar?');
      if (!confirmSwitch) return;
      this.posService.cartItems.set([]);
    }

    this.selectedSectionId.set(sectionId);
  }
}