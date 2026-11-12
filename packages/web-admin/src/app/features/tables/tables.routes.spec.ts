import { provideZonelessChangeDetection, signal, importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter, Router, type Route } from '@angular/router'
import * as Lucide from 'lucide-angular'
import { AuthService, AuthStore } from '@resttek/web-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TABLE_ROUTES } from './tables.routes'
import { routes } from '../../app.routes'
import { ShellComponent } from '../../core/layout/shell.component'
import { RestaurantStore } from '../restaurants/store/restaurant.store'

describe('rutas de mesas', () => {
  it('define lista, alta y edición', () => {
    expect(TABLE_ROUTES.map(r => r.path)).toEqual(['', 'new', ':id/edit'])
    expect(TABLE_ROUTES.every(r => typeof r.loadComponent === 'function')).toBe(true)
  })

  it('app.routes monta tables bajo restaurants/:restaurantId con loadChildren', () => {
    const root = routes.find(r => r.path === '')!
    const restaurant = root.children!.find(r => r.path === 'restaurants/:restaurantId') as Route
    const tables = restaurant.children!.find(r => r.path === 'tables')
    expect(typeof tables?.loadChildren).toBe('function')
  })

  it('loadChildren de tables resuelve TABLE_ROUTES', async () => {
    const root = routes.find(r => r.path === '')!
    const restaurant = root.children!.find(r => r.path === 'restaurants/:restaurantId') as Route
    const tables = restaurant.children!.find(r => r.path === 'tables')!
    expect(await (tables.loadChildren as () => Promise<unknown>)()).toBe(TABLE_ROUTES)
  })
})

describe('menú lateral', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it('incluye el enlace «Mesas» del restaurante expandido', async () => {
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: { logout: vi.fn() } },
        { provide: AuthStore, useValue: { userRole: signal('admin'), user: signal({ firstName: 'A', lastName: 'B', role: 'admin' }) } },
        {
          provide: RestaurantStore,
          useValue: { restaurants: signal([{ id: 'r1', name: 'Uno' }]), loading: signal(false), loadAll: vi.fn() }
        },
        importProvidersFrom(Lucide.LucideAngularModule.pick({
          LayoutDashboard: Lucide.LayoutDashboard, Users: Lucide.Users, Utensils: Lucide.Utensils, Package: Lucide.Package,
          LogOut: Lucide.LogOut, Plus: Lucide.Plus, ChevronRight: Lucide.ChevronRight, Settings: Lucide.Settings,
          Store: Lucide.Store, LayoutGrid: Lucide.LayoutGrid, Menu: Lucide.Menu
        }))
      ]
    })
    const fixture = TestBed.createComponent(ShellComponent)
    fixture.componentInstance.expandedRestaurantId.set('r1')
    await fixture.whenStable()
    const link = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a.sub-nav-item'))
      .find(a => a.textContent?.trim() === 'Mesas')
    expect(link).toBeTruthy()
    expect(link!.getAttribute('href')).toBe('/restaurants/r1/tables')
    void TestBed.inject(Router)
  })
})
