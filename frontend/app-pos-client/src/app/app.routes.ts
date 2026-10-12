import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout';
import { PosComponent } from './features/pos/pos';
import { SalesHistoryComponent } from './features/pos/sales-history/sales-history';
import { InventoryComponent } from './features/inventory/inventory';
import { ProductsComponent } from './features/products/products';
import { CustomersComponent } from './features/customers/customers';

export const routes: Routes = [
    {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'pos', pathMatch: 'full' },
      { path: 'pos', component: PosComponent },
      { path: 'sales-history', component: SalesHistoryComponent },
      { path: 'inventory', component: InventoryComponent }
      ,{ path: 'products', component: ProductsComponent },
      { path: 'customers', component: CustomersComponent }
    ] 
  }
];
