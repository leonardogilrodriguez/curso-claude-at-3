const MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en este restaurante.',
  TableOccupiedError: 'No se puede eliminar una mesa ocupada. Libérala antes de borrarla.',
  TableNotFoundError: 'La mesa ya no existe.',
  TableNumberRequiredError: 'El número de la mesa es obligatorio.',
  InvalidTableCapacityError: 'La capacidad debe ser un número entero mayor o igual que 1.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.'
}

/** Traduce un error HTTP de la API de mesas a un texto en español, por el nombre del error. */
export function tableErrorMessage(err: any, fallback: string): string {
  const name: unknown = err?.error?.error
  return (typeof name === 'string' && MESSAGES[name]) || fallback
}

export function tableErrorName(err: any): string | null {
  const name = err?.error?.error
  return typeof name === 'string' ? name : null
}
