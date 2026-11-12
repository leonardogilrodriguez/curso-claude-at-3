import { describe, expect, it } from 'vitest'
import { validateTable } from './table-form.validation'

describe('validateTable', () => {
  it('acepta una mesa válida', () => {
    expect(validateTable({ number: '7', capacity: 4 })).toEqual({})
  })
  it.each([[''], ['   '], [null], [undefined]])('exige número (%s)', n => {
    expect(validateTable({ number: n, capacity: 4 }).number).toBe('El número de la mesa es obligatorio.')
  })
  it.each([[null], [''], [undefined]])('exige capacidad (%s)', c => {
    expect(validateTable({ number: '1', capacity: c }).capacity).toBe('La capacidad es obligatoria.')
  })
  it.each([[0], [-2], [2.5]])('la capacidad debe ser un entero >= 1 (%s)', c => {
    expect(validateTable({ number: '1', capacity: c }).capacity).toBe('La capacidad debe ser un número entero mayor o igual que 1.')
  })
})
