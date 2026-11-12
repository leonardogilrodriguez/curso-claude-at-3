import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { DuplicatedTableNumberError } from '@errors/DomainErrors.js'

interface TableRow {
    id: string
    restaurant_id: string
    number: string
    description: string | null
    capacity: number
    status: string
    created_at: string
    updated_at: string
}

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findByNumber(restaurantId: string, number: string): Promise<Table | null>
    save(table: Table): Promise<void>
    occupy(id: string, updatedAt: string): Promise<boolean>
    delete(id: string): Promise<void>
}

// Numeric numbers first and in numeric order ("2" before "10"), then the rest alphabetically.
const ORDER_BY_NUMBER = `
    ORDER BY CASE WHEN number GLOB '[0-9]*' AND number NOT GLOB '*[^0-9]*' THEN 0 ELSE 1 END,
             CAST(number AS INTEGER), number
`

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>('SELECT * FROM tables WHERE id = ?', [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `SELECT * FROM tables WHERE restaurant_id = ? ${ORDER_BY_NUMBER}`,
            [restaurantId]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async findByNumber(restaurantId: string, number: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            'SELECT * FROM tables WHERE restaurant_id = ? AND number = ?',
            [restaurantId, number]
        )
        return row ? this.mapToTable(row) : null
    }

    async save(table: Table): Promise<void> {
        try {
            const existing = await this.findById(table.id)
            if (existing) {
                await this.db.run(
                    'UPDATE tables SET number = ?, description = ?, capacity = ?, status = ?, updated_at = ? WHERE id = ?',
                    [table.number, table.description, table.capacity, table.status, table.updatedAt, table.id]
                )
            } else {
                await this.db.run(
                    'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
                )
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('UNIQUE constraint failed: tables.restaurant_id, tables.number')) {
                throw new DuplicatedTableNumberError()
            }
            throw error
        }
    }

    // Conditional update: only one request can move a table from libre to ocupada.
    async occupy(id: string, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE tables SET status = 'ocupada', updated_at = ? WHERE id = ? AND status = 'libre'",
            [updatedAt, id]
        )
        return result.changes === 1
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ?', [id])
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurant_id,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }
}
