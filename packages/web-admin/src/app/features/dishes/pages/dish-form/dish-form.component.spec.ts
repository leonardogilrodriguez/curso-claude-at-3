import { provideZonelessChangeDetection, signal, importProvidersFrom } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LucideAngularModule, ChevronLeft, Plus, Trash2 } from 'lucide-angular'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DishFormComponent } from './dish-form.component'
import { DishStore } from '../../store/dish.store'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'

export const INGREDIENTS = [
  { id: 'i1', name: 'Tomate', unit: 'kg' },
  { id: 'i2', name: 'Queso', unit: 'kg' }
]

export async function setup() {
  const dishStore = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const ingredientStore = { ingredients: signal(INGREDIENTS), loadByRestaurant: vi.fn() }

  TestBed.configureTestingModule({
    imports: [DishFormComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: DishStore, useValue: dishStore },
      { provide: IngredientStore, useValue: ingredientStore },
      importProvidersFrom(LucideAngularModule.pick({ ChevronLeft, Plus, Trash2 }))
    ]
  })
  const fixture: ComponentFixture<DishFormComponent> = TestBed.createComponent(DishFormComponent)
  await fixture.whenStable()
  const el = fixture.nativeElement as HTMLElement
  return { fixture, el, dishStore, ingredientStore, component: fixture.componentInstance }
}

describe('DishFormComponent (humo)', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it('muestra el título de la página', async () => {
    const { el } = await setup()
    expect(el.querySelector('h1')?.textContent).toContain('Nuevo plato')
  })
})

export function byLabel(el: HTMLElement, text: string): HTMLElement | null {
  const label = Array.from(el.querySelectorAll('label')).find(l => l.textContent?.replace('*', '').trim() === text)
  const id = label?.getAttribute('for')
  return id ? el.querySelector<HTMLElement>(`#${id}`) : null
}

describe('DishFormComponent: etiquetas y estructura', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it.each([
    ['Nombre del plato', 'INPUT'],
    ['Precio (€)', 'INPUT'],
    ['Categoría', 'SELECT'],
    ['Disponible', 'SELECT'],
    ['Descripción (opcional)', 'TEXTAREA'],
    ['Ingrediente', 'SELECT'],
    ['Cantidad', 'INPUT']
  ])('el campo «%s» está asociado a su etiqueta', async (label, tag) => {
    const { el } = await setup()
    expect(byLabel(el, label)?.tagName).toBe(tag)
  })

  it('el título es un h1', async () => {
    const { el } = await setup()
    expect(el.querySelectorAll('h1')).toHaveLength(1)
  })

  it('el enlace de volver tiene nombre accesible', async () => {
    const { el } = await setup()
    expect(el.querySelector('a.back-link')?.getAttribute('aria-label')).toBe('Volver a la lista de platos')
  })

  it('los campos obligatorios se marcan con required y aria-required', async () => {
    const { el } = await setup()
    for (const l of ['Nombre del plato', 'Precio (€)']) {
      expect(byLabel(el, l)?.getAttribute('aria-required')).toBe('true')
    }
  })

  it('los ingredientes se agrupan en un fieldset con legend', async () => {
    const { el } = await setup()
    expect(el.querySelector('fieldset > legend')?.textContent).toContain('Ingredientes del plato')
  })

  it('el formulario tiene nombre accesible', async () => {
    const { el } = await setup()
    expect(el.querySelector('form')?.getAttribute('aria-labelledby')).toBe('form-title')
  })
})
