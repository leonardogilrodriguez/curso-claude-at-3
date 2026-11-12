import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from './database.js'

describe('Database migrations: tables', () => {
    let db: Database
    const now = new Date().toISOString()

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'La Trattoria', 'Calle Mayor 10', 'info@trattoria.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('creates the tables table with the expected columns', async () => {
        const columns = await db.all<{ name: string, notnull: number }>('PRAGMA table_info(tables)')
        expect(columns.map(c => c.name)).toEqual(
            ['id', 'restaurant_id', 'number', 'description', 'capacity', 'status', 'created_at', 'updated_at']
        )
        const nullable = columns.filter(c => c.notnull === 0).map(c => c.name)
        expect(nullable).toEqual(['id', 'description'])
    })

    it('enforces a unique number per restaurant', async () => {
        const insert = 'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        await db.run(insert, ['t1', 'r1', '1', null, 4, 'libre', now, now])
        await expect(db.run(insert, ['t2', 'r1', '1', null, 2, 'libre', now, now])).rejects.toThrow(/UNIQUE/)
    })

    it('enforces the foreign key to restaurants', async () => {
        const insert = 'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        await expect(db.run(insert, ['t3', 'nope', '1', null, 4, 'libre', now, now])).rejects.toThrow(/FOREIGN KEY/)
    })
})
