import { describe, expect, it } from 'vitest'
import { validateDish, validateIngredient } from './dish-form.validation'

describe('validateDish', () => {
  it('no devuelve errores con datos válidos', () => {
    expect(validateDish({ name: 'Tarta', price: 6.5 })).toEqual({})
  })

  it('exige el nombre (vacío o solo espacios)', () => {
    expect(validateDish({ name: '', price: 5 }).name).toBe('El nombre del plato es obligatorio.')
    expect(validateDish({ name: '   ', price: 5 }).name).toBe('El nombre del plato es obligatorio.')
  })

  it('exige el precio cuando está vacío', () => {
    expect(validateDish({ name: 'A', price: null }).price).toBe('El precio es obligatorio.')
    expect(validateDish({ name: 'A', price: '' }).price).toBe('El precio es obligatorio.')
  })

  it('exige un precio mayor que 0', () => {
    expect(validateDish({ name: 'A', price: 0 }).price).toBe('El precio debe ser mayor que 0.')
    expect(validateDish({ name: 'A', price: -3 }).price).toBe('El precio debe ser mayor que 0.')
  })

  it('devuelve ambos errores a la vez', () => {
    expect(Object.keys(validateDish({ name: '', price: 0 }))).toEqual(['name', 'price'])
  })
})

describe('validateIngredient', () => {
  const existing = [{ ingredientId: 'i1', quantity: 1 }]

  it('acepta un ingrediente nuevo con cantidad positiva', () => {
    expect(validateIngredient('i2', 2, existing)).toBeNull()
  })

  it('pide seleccionar un ingrediente', () => {
    expect(validateIngredient('', 1, existing)).toBe('Selecciona un ingrediente para añadirlo.')
  })

  it('exige cantidad mayor que 0', () => {
    expect(validateIngredient('i2', 0, existing)).toBe('La cantidad debe ser mayor que 0.')
    expect(validateIngredient('i2', Number.NaN, existing)).toBe('La cantidad debe ser mayor que 0.')
  })

  it('rechaza duplicados', () => {
    expect(validateIngredient('i1', 1, existing)).toBe('Ese ingrediente ya está en el plato.')
  })
})
