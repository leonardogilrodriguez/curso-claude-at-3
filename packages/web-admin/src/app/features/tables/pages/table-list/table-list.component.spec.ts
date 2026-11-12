import { provideZonelessChangeDetection, signal, importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, Plus, Edit, Trash2, LayoutGrid } from 'lucide-angular'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableListComponent } from './table-list.component'
import { TableStore } from '../../store/table.store'
import type { Table } from '../../models/table.model'

const mesa = (id: string, extra: Partial<Table> = {}): Table => ({
  id, restaurantId: 'r1', number: id, description: null, capacity: 2, status: 'libre',
  createdAt: '', updatedAt: '', ...extra
})

async function setup(tables: Table[] = [], opts: { loading?: boolean; error?: string | null } = {}) {
  const store = {
    tables: signal(tables),
    loading: signal(opts.loading ?? false),
    error: signal(opts.error ?? null),
    loadByRestaurant: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined)
  }
  TestBed.configureTestingModule({
    imports: [TableListComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: TableStore, useValue: store },
      { provide: ActivatedRoute, useValue: { parent: { paramMap: of({ get: () => 'r1' }) } } },
      importProvidersFrom(LucideAngularModule.pick({ Plus, Edit, Trash2, LayoutGrid }))
    ]
  })
  const fixture = TestBed.createComponent(TableListComponent)
  await fixture.whenStable()
  return { fixture, el: fixture.nativeElement as HTMLElement, store }
}

describe('TableListComponent', () => {
  beforeEach(() => TestBed.resetTestingModule())
  afterEach(() => vi.restoreAllMocks())

  it('carga las mesas del restaurante de la ruta', async () => {
    const { store } = await setup()
    expect(store.loadByRestaurant).toHaveBeenCalledWith('r1')
  })

  it('muestra el estado vacío', async () => {
    const { el } = await setup([])
    expect(el.textContent).toContain('No hay mesas para este restaurante')
  })

  it('muestra el error de carga', async () => {
    const { el } = await setup([], { error: 'No se pudieron cargar las mesas.' })
    expect(el.querySelector('.alert-error')?.textContent).toContain('No se pudieron cargar las mesas.')
  })

  it('lista número, descripción, capacidad y estado como etiqueta', async () => {
    const { el } = await setup([mesa('7', { description: 'Terraza', capacity: 4, status: 'ocupada' })])
    const row = el.querySelector('tbody tr')!
    expect(row.textContent).toContain('7')
    expect(row.textContent).toContain('Terraza')
    expect(row.textContent).toContain('4')
    const badge = row.querySelector('.badge')!
    expect(badge.textContent?.trim()).toBe('Ocupada')
    expect(badge.classList).toContain('badge-ocupada')
  })

  it('los enlaces y botones de acción tienen nombre accesible', async () => {
    const { el } = await setup([mesa('7')])
    expect(el.querySelector('tbody a')?.getAttribute('aria-label')).toBe('Editar mesa 7')
    expect(el.querySelector('tbody button')?.getAttribute('aria-label')).toBe('Eliminar mesa 7')
  })

  it('borra la mesa tras confirmar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { el, store, fixture } = await setup([mesa('7', { id: 't7' })])
    el.querySelector<HTMLButtonElement>('tbody button')!.click()
    await fixture.whenStable()
    expect(store.delete).toHaveBeenCalledWith('r1', 't7')
  })

  it('no borra si se cancela la confirmación', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { el, store } = await setup([mesa('7')])
    el.querySelector<HTMLButtonElement>('tbody button')!.click()
    expect(store.delete).not.toHaveBeenCalled()
  })

  it('muestra un mensaje en español si la mesa está ocupada (409)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { el, store, fixture } = await setup([mesa('7')])
    store.delete.mockRejectedValue({ status: 409, error: { error: 'TableOccupiedError', message: 'An occupied table cannot be deleted' } })
    el.querySelector<HTMLButtonElement>('tbody button')!.click()
    await fixture.whenStable()
    const alert = el.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('No se puede eliminar una mesa ocupada')
  })

  it('muestra un mensaje genérico ante otros errores al borrar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { el, store, fixture } = await setup([mesa('7')])
    store.delete.mockRejectedValue({ status: 500, error: {} })
    el.querySelector<HTMLButtonElement>('tbody button')!.click()
    await fixture.whenStable()
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Error al eliminar la mesa.')
  })
})
