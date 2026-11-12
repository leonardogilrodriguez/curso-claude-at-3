import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from './order.repository.js'
import { Database } from '@config/database.js'
import type { Order } from '@models/order.model.js'

describe('SqliteOrderRepository tableNumber (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    function order(id: string, tableId: string | null): Order {
        return {
            id,
            restaurantId: 'r1',
            tableId,
            tableNumber: null,
            clientId: 'c1',
            createdAt: new Date(),
            items: [{ id: `${id}-item`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
        }
    }

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
        await db.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Pizza', null, 9.5, 'principal', 1, 'r1', now, now]
        )
        await db.run(
            'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['t7', 'r1', '7', null, 4, 'ocupada', now, now]
        )

        await repo.create(order('with-table', 't7'))
        await repo.create(order('without-table', null))
        await repo.create(order('legacy-table', 'mesa-antigua'))
    })

    afterAll(async () => {
        await db.close()
    })

    function numbersById(orders: Order[]) {
        return Object.fromEntries(orders.map(o => [o.id, o.tableNumber]))
    }

    const expected = { 'with-table': '7', 'without-table': null, 'legacy-table': null }

    it('adds tableNumber in findById', async () => {
        for (const [id, number] of Object.entries(expected)) {
            const found = await repo.findById(id)
            expect(found).toHaveProperty('tableNumber', number)
        }
        expect((await repo.findById('legacy-table'))?.tableId).toBe('mesa-antigua')
    })

    it('adds tableNumber in findActiveByRestaurant', async () => {
        expect(numbersById(await repo.findActiveByRestaurant('r1'))).toEqual(expected)
    })

    it('adds tableNumber in findByClientId', async () => {
        expect(numbersById(await repo.findByClientId('c1'))).toEqual(expected)
    })
})
