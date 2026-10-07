import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/components/layout/layout';
import { PosComponent } from './features/pos/pos';

export const routes: Routes = [
    {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'pos', pathMatch: 'full' },
      { path: 'pos', component: PosComponent }
    ] 
  }
];
