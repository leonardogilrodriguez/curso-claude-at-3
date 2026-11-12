import { provideZonelessChangeDetection, importProvidersFrom } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { LucideAngularModule, ChevronLeft } from 'lucide-angular'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TableFormComponent } from './table-form.component'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'

async function setup(id: string | null = null) {
  const store = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const service = {
    getById: vi.fn().mockReturnValue(of({
      id: 't1', restaurantId: 'r1', number: '7', description: 'Terraza', capacity: 4, status: 'reservada', createdAt: '', updatedAt: ''
    }))
  }
  TestBed.configureTestingModule({
    imports: [TableFormComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: '**', children: [] }]),
      { provide: TableStore, useValue: store },
      { provide: TableService, useValue: service },
      {
        provide: ActivatedRoute,
        useValue: { parent: { snapshot: { params: { restaurantId: 'r1' } } }, snapshot: { paramMap: { get: () => id } } }
      },
      importProvidersFrom(LucideAngularModule.pick({ ChevronLeft }))
    ]
  })
  const router = TestBed.inject(Router)
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
  const fixture = TestBed.createComponent(TableFormComponent)
  await fixture.whenStable()
  const el = fixture.nativeElement as HTMLElement
  return { fixture, el, store, service, navigate }
}

function byLabel(el: HTMLElement, text: string): HTMLElement | null {
  const label = Array.from(el.querySelectorAll('label')).find(l => l.textContent?.replace('*', '').trim() === text)
  const id = label?.getAttribute('for')
  return id ? el.querySelector<HTMLElement>(`#${id}`) : null
}

async function fill(fixture: any, el: HTMLElement, label: string, value: string) {
  const field = byLabel(el, label) as HTMLInputElement
  field.value = value
  field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input'))
  await fixture.whenStable()
}

async function submit(fixture: any, el: HTMLElement) {
  el.querySelector('form')!.dispatchEvent(new Event('submit'))
  await fixture.whenStable()
  await fixture.whenStable()
}

describe('TableFormComponent', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it('muestra el título según el modo', async () => {
    const { el } = await setup()
    expect(el.querySelector('h1')?.textContent).toContain('Nueva mesa')
  })

  it.each([
    ['Número de la mesa', 'INPUT'],
    ['Descripción (opcional)', 'TEXTAREA'],
    ['Capacidad', 'INPUT'],
    ['Estado', 'SELECT']
  ])('el campo «%s» está asociado a su etiqueta', async (label, tag) => {
    const { el } = await setup()
    expect(byLabel(el, label)?.tagName).toBe(tag)
  })

  it('número y capacidad son obligatorios (required + aria-required)', async () => {
    const { el } = await setup()
    for (const l of ['Número de la mesa', 'Capacidad']) {
      expect(byLabel(el, l)?.getAttribute('aria-required')).toBe('true')
    }
  })

  it('el enlace de volver tiene nombre accesible', async () => {
    const { el } = await setup()
    expect(el.querySelector('a.back-link')?.getAttribute('aria-label')).toBe('Volver a la lista de mesas')
  })

  it('el estado ofrece libre, ocupada y reservada y por defecto es libre', async () => {
    const { el } = await setup()
    const select = byLabel(el, 'Estado') as HTMLSelectElement
    expect(Array.from(select.options).map(o => o.textContent?.trim())).toEqual(['Libre', 'Ocupada', 'Reservada'])
    expect(select.value).toBe('libre')
  })

  it('con datos inválidos no guarda y muestra errores junto a los campos', async () => {
    const { fixture, el, store } = await setup()
    await submit(fixture, el)
    expect(store.create).not.toHaveBeenCalled()
    expect(el.querySelector('#table-number-error')?.textContent).toContain('El número de la mesa es obligatorio.')
    expect(byLabel(el, 'Número de la mesa')?.getAttribute('aria-invalid')).toBe('true')
    expect(byLabel(el, 'Número de la mesa')?.getAttribute('aria-describedby')).toBe('table-number-error')
    expect(el.querySelector('.error-summary')?.textContent).toContain('2 errores')
  })

  it('crea la mesa enviando siempre el estado y vuelve a la lista', async () => {
    const { fixture, el, store, navigate } = await setup()
    await fill(fixture, el, 'Número de la mesa', ' 7 ')
    await fill(fixture, el, 'Capacidad', '4')
    await submit(fixture, el)
    expect(store.create).toHaveBeenCalledWith('r1', { number: '7', description: null, capacity: 4, status: 'libre' })
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'r1', 'tables'])
  })

  it('en edición carga la mesa y la actualiza', async () => {
    const { fixture, el, store, service } = await setup('t1')
    expect(service.getById).toHaveBeenCalledWith('r1', 't1')
    expect(el.querySelector('h1')?.textContent).toContain('Editar mesa')
    expect((byLabel(el, 'Número de la mesa') as HTMLInputElement).value).toBe('7')
    expect((byLabel(el, 'Estado') as HTMLSelectElement).value).toBe('reservada')
    await fill(fixture, el, 'Capacidad', '6')
    await submit(fixture, el)
    expect(store.update).toHaveBeenCalledWith('r1', 't1', { number: '7', description: 'Terraza', capacity: 6, status: 'reservada' })
  })

  it('el número duplicado se muestra junto al campo número', async () => {
    const { fixture, el, store } = await setup()
    store.create.mockRejectedValue({ status: 400, error: { error: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' } })
    await fill(fixture, el, 'Número de la mesa', '7')
    await fill(fixture, el, 'Capacidad', '4')
    await submit(fixture, el)
    const msg = el.querySelector('#table-number-error')
    expect(msg?.textContent).toContain('Ya existe una mesa con ese número')
    expect(byLabel(el, 'Número de la mesa')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('otros errores del servidor se muestran en español en una alerta', async () => {
    const { fixture, el, store } = await setup()
    store.create.mockRejectedValue({ status: 500, error: {} })
    await fill(fixture, el, 'Número de la mesa', '7')
    await fill(fixture, el, 'Capacidad', '4')
    await submit(fixture, el)
    expect(el.querySelector('.alert-error[role="alert"]')?.textContent).toContain('Error al guardar la mesa.')
  })
})
