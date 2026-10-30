import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout';
import { DashboardComponent } from './features/dashboard/dashboard';
import { PosComponent } from './features/pos/pos';
import { SalesHistoryComponent } from './features/pos/sales-history/sales-history';
import { InventoryComponent } from './features/inventory/inventory';
import { ProductsComponent } from './features/products/products';
import { CustomersComponent } from './features/customers/customers';
import { PurchasesComponent } from './features/purchases/purchases';
import { SuppliersComponent } from './features/suppliers/suppliers';
import { EmployeesComponent } from './features/employees/employees';

export const routes: Routes = [
    {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'pos', component: PosComponent },
      { path: 'sales-history', component: SalesHistoryComponent },
      { path: 'inventory', component: InventoryComponent }
      ,{ path: 'products', component: ProductsComponent },
      { path: 'purchases', component: PurchasesComponent },
      { path: 'suppliers', component: SuppliersComponent },
      { path: 'employees', component: EmployeesComponent },
      { path: 'customers', component: CustomersComponent }
    ] 
  }
];
