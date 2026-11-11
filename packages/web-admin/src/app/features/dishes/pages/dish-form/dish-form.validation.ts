import type { DishIngredient } from '../../models/dish.model'

export interface DishFormValues {
  name: string | null | undefined
  price: number | string | null | undefined
}

export interface DishFormErrors {
  name?: string
  price?: string
}

export function validateDish(values: DishFormValues): DishFormErrors {
  const errors: DishFormErrors = {}

  if (!values.name?.trim()) {
    errors.name = 'El nombre del plato es obligatorio.'
  }

  if (values.price === null || values.price === undefined || values.price === '') {
    errors.price = 'El precio es obligatorio.'
  } else if (!(Number(values.price) > 0)) {
    errors.price = 'El precio debe ser mayor que 0.'
  }

  return errors
}

export function validateIngredient(
  ingredientId: string,
  quantity: number,
  existing: DishIngredient[]
): string | null {
  if (!ingredientId) return 'Selecciona un ingrediente para añadirlo.'
  if (!(quantity > 0)) return 'La cantidad debe ser mayor que 0.'
  if (existing.some(i => i.ingredientId === ingredientId)) return 'Ese ingrediente ya está en el plato.'
  return null
}
