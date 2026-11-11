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
