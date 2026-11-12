export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  number: string
  description: string | null
  capacity: number
  status: TableStatus
  createdAt: string
  updatedAt: string
}

export interface CreateTableDto {
  number: string
  description: string | null
  capacity: number
  status: TableStatus
}
