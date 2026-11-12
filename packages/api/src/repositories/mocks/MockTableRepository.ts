import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'
import { DuplicatedTableNumberError } from '@errors/DomainErrors.js'

export class MockTableRepository implements TableRepository {
    tables: Table[] = []

    async findById(id: string): Promise<Table | null> {
        const table = this.tables.find(t => t.id === id)
        return table ? { ...table } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tables
            .filter(t => t.restaurantId === restaurantId)
            .map(t => ({ ...t }))
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    }

    async findByNumber(restaurantId: string, number: string): Promise<Table | null> {
        const table = this.tables.find(t => t.restaurantId === restaurantId && t.number === number)
        return table ? { ...table } : null
    }

    async save(table: Table): Promise<void> {
        const duplicated = this.tables.some(
            t => t.id !== table.id && t.restaurantId === table.restaurantId && t.number === table.number
        )
        if (duplicated) {
            throw new DuplicatedTableNumberError()
        }
        const index = this.tables.findIndex(t => t.id === table.id)
        if (index >= 0) {
            this.tables[index] = { ...table }
        } else {
            this.tables.push({ ...table })
        }
    }

    async occupy(id: string, updatedAt: string): Promise<boolean> {
        const table = this.tables.find(t => t.id === id)
        if (!table || table.status !== 'libre') {
            return false
        }
        table.status = 'ocupada'
        table.updatedAt = updatedAt
        return true
    }

    async delete(id: string): Promise<void> {
        this.tables = this.tables.filter(t => t.id !== id)
    }
}
