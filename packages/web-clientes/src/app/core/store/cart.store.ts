import { Injectable, signal, computed } from '@angular/core'

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
  restaurantId: string
  ingredients: { ingredientId: string; quantity: number }[]
}

export interface SelectedTable {
  id: string
  number: string
  restaurantId: string
}

export interface CartItem {
  dish: Dish
  quantity: number
  notes: string
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([])
  private readonly _restaurantId = signal<string | null>(null)

  private readonly _table = signal<SelectedTable | null>(null)

  readonly items = this._items.asReadonly()
  readonly table = this._table.asReadonly()
  readonly restaurantId = this._restaurantId.asReadonly()

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  )

  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0)
  )

  addItem(dish: Dish, quantity: number = 1, notes: string = ''): void {
    if (this._restaurantId() && this._restaurantId() !== dish.restaurantId) {
      this._items.set([])
    }
    if (this._table() && this._table()!.restaurantId !== dish.restaurantId) {
      this._table.set(null)
    }
    this._restaurantId.set(dish.restaurantId)

    const existingIndex = this._items().findIndex(
      item => item.dish.id === dish.id && item.notes === notes
    )

    if (existingIndex >= 0) {
      const items = [...this._items()]
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity
      }
      this._items.set(items)
    } else {
      this._items.update(items => [...items, { dish, quantity, notes }])
    }
  }

  setTable(table: SelectedTable): void {
    if (this._restaurantId() && this._restaurantId() !== table.restaurantId) {
      this._items.set([])
      this._restaurantId.set(null)
    }
    this._table.set(table)
  }

  clearTable(): void {
    this._table.set(null)
  }

  tableIdFor(restaurantId: string): string | null {
    const table = this._table()
    return table && table.restaurantId === restaurantId ? table.id : null
  }

  removeItem(dishId: string): void {
    const items = this._items().filter(item => item.dish.id !== dishId)
    this._items.set(items)
    if (items.length === 0) {
      this._restaurantId.set(null)
    }
  }

  updateQuantity(dishId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(dishId)
      return
    }
    const items = this._items().map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    )
    this._items.set(items)
  }

  clear(): void {
    this._table.set(null)
    this._items.set([])
    this._restaurantId.set(null)
  }
}
