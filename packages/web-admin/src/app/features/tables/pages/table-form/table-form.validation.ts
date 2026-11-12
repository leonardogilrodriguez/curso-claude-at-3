export interface TableFormValues {
  number: string | null | undefined
  capacity: number | string | null | undefined
}

export interface TableFormErrors {
  number?: string
  capacity?: string
}

export function validateTable(values: TableFormValues): TableFormErrors {
  const errors: TableFormErrors = {}

  if (!values.number?.trim()) {
    errors.number = 'El número de la mesa es obligatorio.'
  }

  if (values.capacity === null || values.capacity === undefined || values.capacity === '') {
    errors.capacity = 'La capacidad es obligatoria.'
  } else if (!Number.isInteger(Number(values.capacity)) || Number(values.capacity) < 1) {
    errors.capacity = 'La capacidad debe ser un número entero mayor o igual que 1.'
  }

  return errors
}
