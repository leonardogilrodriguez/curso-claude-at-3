import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import type { Table, CreateTableDto } from '../models/table.model'

const mesa = (id: string, extra: Partial<Table> = {}): Table => ({
  id, restaurantId: 'r1', number: id, description: null, capacity: 2, status: 'libre',
  createdAt: '2026-11-12T09:00:00.000Z', updatedAt: '2026-11-12T09:00:00.000Z', ...extra
})
const dto: CreateTableDto = { number: '9', description: null, capacity: 4, status: 'libre' }

describe('TableStore', () => {
  let service: { getAll: any; create: any; update: any; delete: any }
  let store: TableStore

  beforeEach(() => {
    TestBed.resetTestingModule()
    service = { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: TableService, useValue: service }]
    })
    store = TestBed.inject(TableStore)
  })

  it('carga las mesas del restaurante', async () => {
    service.getAll.mockReturnValue(of([mesa('1'), mesa('2')]))
    await store.loadByRestaurant('r1')
    expect(store.tables().map(t => t.id)).toEqual(['1', '2'])
    expect(store.loading()).toBe(false)
    expect(store.error()).toBeNull()
  })

  it('expone un error si la carga falla', async () => {
    const failing = new Subject<Table[]>()
    service.getAll.mockReturnValue(failing)
    const p = store.loadByRestaurant('r1')
    expect(store.loading()).toBe(true)
    failing.error(new Error('x'))
    await p
    expect(store.error()).toBe('No se pudieron cargar las mesas.')
    expect(store.loading()).toBe(false)
  })

  it('ignora la respuesta obsoleta de un restaurante anterior', async () => {
    const first = new Subject<Table[]>()
    service.getAll.mockReturnValueOnce(first).mockReturnValueOnce(of([mesa('B')]))
    const p1 = store.loadByRestaurant('r1')
    await store.loadByRestaurant('r2')
    first.next([mesa('A')])
    first.complete()
    await p1
    expect(store.tables().map(t => t.id)).toEqual(['B'])
    expect(store.loading()).toBe(false)
  })

  it('crea y añade la mesa a la lista', async () => {
    service.getAll.mockReturnValue(of([mesa('1')]))
    await store.loadByRestaurant('r1')
    service.create.mockReturnValue(of(mesa('2')))
    await store.create('r1', dto)
    expect(service.create).toHaveBeenCalledWith('r1', dto)
    expect(store.tables().map(t => t.id)).toEqual(['1', '2'])
  })

  it('actualiza la mesa en la lista', async () => {
    service.getAll.mockReturnValue(of([mesa('1')]))
    await store.loadByRestaurant('r1')
    service.update.mockReturnValue(of(mesa('1', { capacity: 8 })))
    await store.update('r1', '1', dto)
    expect(store.tables()[0].capacity).toBe(8)
  })

  it('borra la mesa de la lista', async () => {
    service.getAll.mockReturnValue(of([mesa('1'), mesa('2')]))
    await store.loadByRestaurant('r1')
    service.delete.mockReturnValue(of(undefined))
    await store.delete('r1', '1')
    expect(store.tables().map(t => t.id)).toEqual(['2'])
  })

  it('propaga el error de crear sin modificar la lista', async () => {
    const failing = new Subject<Table>()
    service.create.mockReturnValue(failing)
    const p = store.create('r1', dto)
    failing.error({ error: { error: 'DuplicatedTableNumberError' } })
    await expect(p).rejects.toBeTruthy()
    expect(store.tables()).toEqual([])
  })
})
