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
import { ExpensesComponent } from './features/expenses/expenses';
import { LoginComponent } from './features/auth/login';
import { UsersComponent } from './features/users/users';
import { adminGuard, authGuard, guestGuard, homeRedirect } from './core/auth/auth.guards';

// SEC-01: todo exige sesión; las pantallas marcadas con adminGuard son sólo del administrador
// (la API también lo valida). El cajero entra al POS.
export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', redirectTo: homeRedirect, pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
      { path: 'pos', component: PosComponent },
      { path: 'sales-history', component: SalesHistoryComponent },
      { path: 'inventory', component: InventoryComponent },
      { path: 'products', component: ProductsComponent, canActivate: [adminGuard] },
      { path: 'purchases', component: PurchasesComponent, canActivate: [adminGuard] },
      { path: 'suppliers', component: SuppliersComponent, canActivate: [adminGuard] },
      { path: 'employees', component: EmployeesComponent, canActivate: [adminGuard] },
      { path: 'customers', component: CustomersComponent },
      { path: 'expenses', component: ExpensesComponent, canActivate: [adminGuard] },
      { path: 'users', component: UsersComponent, canActivate: [adminGuard] }
    ]
  },
  { path: '**', redirectTo: '' }
];
