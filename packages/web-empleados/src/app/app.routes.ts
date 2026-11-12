import { inject } from '@angular/core';
import { Routes, Router, CanActivateFn } from '@angular/router';
import { LoginComponent } from '@resttek/web-shared';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard, AuthStore } from '@resttek/web-shared';

const mesasGuard: CanActivateFn = () => {
  const role = inject(AuthStore).userRole();
  return role === 'camarero' || role === 'manager' || inject(Router).createUrlTree(['/']);
};

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@resttek/web-shared').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'cocina',
        pathMatch: 'full'
      },
      {
        path: 'cocina',
        loadComponent: () => import('./features/orders/pages/cocina/cocina.component').then(m => m.CocinaComponent),
      },
      {
        path: 'barra',
        loadComponent: () => import('./features/orders/pages/barra/barra.component').then(m => m.BarraComponent),
      },
      {
        path: 'salon',
        loadComponent: () => import('./features/orders/pages/salon/salon.component').then(m => m.SalonComponent),
      },
      {
        path: 'mesas',
        loadComponent: () => import('./features/tables/pages/mesas/mesas.component').then(m => m.MesasComponent),
        canActivate: [mesasGuard],
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./core/layout/not-found.component').then(m => m.NotFoundComponent)
  }
];
