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
      provideRouter([{ path: '**', children: [] }]),
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

function setValue(el: HTMLElement, value: string) {
  const input = el as HTMLInputElement | HTMLSelectElement
  input.value = value
  input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input'))
}

export async function addIngredientUI(
  fixture: ComponentFixture<DishFormComponent>,
  id: string,
  qty: number
) {
  const el = fixture.nativeElement as HTMLElement
  setValue(byLabel(el, 'Ingrediente')!, id)
  setValue(byLabel(el, 'Cantidad')!, String(qty))
  // Como en el navegador, debe haber un ciclo de detección entre rellenar y pulsar Añadir
  await fixture.whenStable()
  await new Promise(r => setTimeout(r, 20))
  el.querySelector<HTMLButtonElement>('button.add-btn')!.click()
  await fixture.whenStable()
  await new Promise(r => setTimeout(r)) // ngModel escribe el valor al DOM de forma asíncrona
  await fixture.whenStable()
  await new Promise(r => setTimeout(r, 20))
}

describe('DishFormComponent: controles semánticos', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it('Guardar es un botón submit', async () => {
    const { el } = await setup()
    const btn = el.querySelector('.form-actions button')
    expect(btn?.getAttribute('type')).toBe('submit')
    expect(btn?.textContent).toContain('Guardar')
  })

  it('Cancelar es un enlace', async () => {
    const { el } = await setup()
    expect(el.querySelector('.form-actions a')?.textContent).toContain('Cancelar')
  })

  it('no hay div con manejador de clic', async () => {
    const { fixture, el } = await setup()
    expect(fixture.nativeElement.outerHTML).not.toMatch(/<div[^>]*(ng-reflect-)?click/)
    expect(el.querySelectorAll('div[role="button"]')).toHaveLength(0)
  })

  it('el botón Añadir ingrediente es type=button y tiene nombre', async () => {
    const { el } = await setup()
    const btn = el.querySelector<HTMLButtonElement>('button.add-btn')
    expect(btn?.type).toBe('button')
    expect(btn?.textContent).toContain('Añadir ingrediente')
  })

  it('el botón Quitar es type=button y nombra el ingrediente', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, 'i1', 2)
    const btn = el.querySelector<HTMLButtonElement>('.chip-remove')
    expect(btn?.type).toBe('button')
    expect(btn?.getAttribute('aria-label')).toBe('Quitar Tomate (kg)')
  })

  it('Enter en la cantidad añade el ingrediente sin enviar el formulario', async () => {
    const { fixture, el, component, dishStore } = await setup()
    setValue(byLabel(el, 'Ingrediente')!, 'i1')
    setValue(byLabel(el, 'Cantidad')!, '3')
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    byLabel(el, 'Cantidad')!.dispatchEvent(event)
    await fixture.whenStable()
    expect(event.defaultPrevented).toBe(true)
    expect(component.form.ingredients).toEqual([{ ingredientId: 'i1', quantity: 3 }])
    expect(dishStore.create).not.toHaveBeenCalled()
  })

  it('Guardar se deshabilita mientras se guarda', async () => {
    const { fixture, el, component } = await setup()
    component.loading.set(true)
    await fixture.whenStable()
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true)
  })
})

async function submit(fixture: ComponentFixture<DishFormComponent>) {
  const el = fixture.nativeElement as HTMLElement
  el.querySelector<HTMLButtonElement>('button[type=submit]')!.click()
  await fixture.whenStable()
  await new Promise(r => setTimeout(r))
  await fixture.whenStable()
}

describe('DishFormComponent: errores al enviar', () => {
  beforeEach(() => TestBed.resetTestingModule())

  it('enviar vacío no guarda y muestra un resumen con 2 errores', async () => {
    const { fixture, el, dishStore } = await setup()
    await submit(fixture)
    expect(dishStore.create).not.toHaveBeenCalled()
    const summary = el.querySelector('.error-summary')
    expect(summary?.getAttribute('role')).toBe('alert')
    expect(summary?.querySelectorAll('li')).toHaveLength(2)
  })

  it('los campos inválidos tienen aria-invalid y aria-describedby al mensaje', async () => {
    const { fixture, el } = await setup()
    await submit(fixture)
    for (const [label, errId] of [['Nombre del plato', 'dish-name-error'], ['Precio (€)', 'dish-price-error']]) {
      const field = byLabel(el, label)!
      expect(field.getAttribute('aria-invalid')).toBe('true')
      expect(field.getAttribute('aria-describedby')).toBe(errId)
      expect(el.querySelector(`#${errId}`)?.textContent?.length).toBeGreaterThan(0)
    }
  })

  it('el foco pasa al resumen de errores', async () => {
    const { fixture, el } = await setup()
    document.body.appendChild(el)
    await submit(fixture)
    expect(document.activeElement).toBe(el.querySelector('.error-summary'))
    el.remove()
  })

  it('pulsar un enlace del resumen enfoca el campo y no navega', async () => {
    const { fixture, el } = await setup()
    document.body.appendChild(el)
    await submit(fixture)
    const link = el.querySelector<HTMLAnchorElement>('.error-summary a')!
    const event = new MouseEvent('click', { cancelable: true, bubbles: true })
    link.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byLabel(el, 'Nombre del plato'))
    el.remove()
  })

  it('con el nombre y el precio válidos llama a create una vez', async () => {
    const { fixture, el, dishStore } = await setup()
    setValue(byLabel(el, 'Nombre del plato')!, 'Tarta')
    setValue(byLabel(el, 'Precio (€)')!, '6.5')
    await submit(fixture)
    expect(dishStore.create).toHaveBeenCalledTimes(1)
    expect(dishStore.create.mock.calls[0][1]).toMatchObject({ name: 'Tarta', price: 6.5 })
    expect(el.querySelector('.error-summary')).toBeNull()
  })

  it('corregir tras un error elimina los mensajes al reenviar', async () => {
    const { fixture, el } = await setup()
    await submit(fixture)
    setValue(byLabel(el, 'Nombre del plato')!, 'Tarta')
    setValue(byLabel(el, 'Precio (€)')!, '4')
    await submit(fixture)
    expect(el.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  })
})

describe('DishFormComponent: ingredientes', () => {
  beforeEach(() => TestBed.resetTestingModule())

  const live = (el: HTMLElement) => el.querySelector('[role="status"]')?.textContent?.trim()

  it('añadir muestra el chip, vacía el selector y lo anuncia', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, 'i1', 2)
    expect(el.querySelector('.ingredient-chip')?.textContent).toContain('Tomate (kg) — 2')
    const sel = byLabel(el, 'Ingrediente') as HTMLSelectElement
    expect(sel.value).toBe('')
    expect(live(el)).toBe('Ingrediente añadido: Tomate (kg).')
  })

  it('sin seleccionar ingrediente muestra un error enlazado con aria-describedby', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, '', 1)
    expect(el.querySelector('#ingredient-error')?.textContent).toContain('Selecciona un ingrediente')
    expect(byLabel(el, 'Ingrediente')?.getAttribute('aria-invalid')).toBe('true')
    expect(byLabel(el, 'Ingrediente')?.getAttribute('aria-describedby')).toBe('ingredient-error')
    expect(el.querySelectorAll('.ingredient-chip')).toHaveLength(0)
  })

  it('una cantidad 0 muestra error', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, 'i1', 0)
    expect(el.querySelector('#ingredient-error')?.textContent).toContain('mayor que 0')
  })

  it('un ingrediente duplicado muestra error y no se añade dos veces', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, 'i1', 1)
    await addIngredientUI(fixture, 'i1', 1)
    expect(el.querySelector('#ingredient-error')?.textContent).toContain('ya está')
    expect(el.querySelectorAll('.ingredient-chip')).toHaveLength(1)
  })

  it('el error desaparece tras añadir correctamente', async () => {
    const { fixture, el } = await setup()
    await addIngredientUI(fixture, '', 1)
    await addIngredientUI(fixture, 'i2', 1)
    expect(el.querySelector('#ingredient-error')).toBeNull()
  })

  it('quitar elimina el chip, lo anuncia y lleva el foco al selector', async () => {
    const { fixture, el } = await setup()
    document.body.appendChild(el)
    await addIngredientUI(fixture, 'i1', 1)
    el.querySelector<HTMLButtonElement>('.chip-remove')!.click()
    await fixture.whenStable()
    expect(el.querySelectorAll('.ingredient-chip')).toHaveLength(0)
    expect(live(el)).toBe('Ingrediente quitado: Tomate (kg).')
    expect(document.activeElement).toBe(byLabel(el, 'Ingrediente'))
    el.remove()
  })

  it('sin ingredientes se muestra un texto vacío en vez de la lista', async () => {
    const { el } = await setup()
    expect(el.querySelector('ul.ingredient-chips')).toBeNull()
    expect(el.querySelector('.ingredients-empty')).not.toBeNull()
  })
})
