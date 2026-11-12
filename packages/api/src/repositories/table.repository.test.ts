import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { DuplicatedTableNumberError } from '@errors/DomainErrors.js'

function buildTable(overrides: Partial<Table> = {}): Table {
    const now = new Date().toISOString()
    return {
        id: 't1',
        restaurantId: 'r1',
        number: '1',
        description: 'Ventana',
        capacity: 4,
        status: 'libre',
        createdAt: now,
        updatedAt: now,
        ...overrides
    }
}

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('saves a table and finds it by id', async () => {
        await repo.save(buildTable())

        const found = await repo.findById('t1')
        expect(found).toEqual(buildTable({ createdAt: found!.createdAt, updatedAt: found!.updatedAt }))
    })

    it('returns null when the table does not exist', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('lists the tables of a restaurant ordered by number', async () => {
        await repo.save(buildTable({ id: 't10', number: '10', capacity: 6 }))
        await repo.save(buildTable({ id: 't2', number: '2', capacity: 2, description: null }))
        await repo.save(buildTable({ id: 'tT', number: 'T1', capacity: 8 }))
        await repo.save(buildTable({ id: 'other', restaurantId: 'r2', number: '1' }))

        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual(['1', '2', '10', 'T1'])
        expect(tables.find(t => t.id === 't2')?.description).toBeNull()
    })

    it('updates an existing table', async () => {
        const original = await repo.findById('t2')
        await repo.save({ ...original!, number: '3', capacity: 5, status: 'reservada', description: 'Barra', updatedAt: '2030-01-01T00:00:00.000Z' })

        const updated = await repo.findById('t2')
        expect(updated).toMatchObject({ number: '3', capacity: 5, status: 'reservada', description: 'Barra', updatedAt: '2030-01-01T00:00:00.000Z' })
        expect(updated?.createdAt).toBe(original?.createdAt)
    })

    it('finds a table by restaurant and number', async () => {
        expect((await repo.findByNumber('r1', '10'))?.id).toBe('t10')
        expect((await repo.findByNumber('r2', '10'))).toBeNull()
    })

    it('throws DuplicatedTableNumberError when the number already exists in the restaurant', async () => {
        await expect(repo.save(buildTable({ id: 'dup', number: '10' }))).rejects.toThrow(DuplicatedTableNumberError)
        await expect(repo.save({ ...(await repo.findById('t10'))!, number: '1' })).rejects.toThrow(DuplicatedTableNumberError)
    })

    it('allows the same number in another restaurant', async () => {
        await expect(repo.save(buildTable({ id: 'r2-10', restaurantId: 'r2', number: '10' }))).resolves.toBeUndefined()
    })

    it('deletes a table', async () => {
        await repo.delete('t10')
        expect(await repo.findById('t10')).toBeNull()
    })
})

describe('SqliteTableRepository.occupy (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'Restaurante', 'Calle Mayor 10', 'r1@resttek.com', '+34 612345678', 'Carlos', 'García', now, now]
        )
        await repo.save(buildTable({ id: 'free', number: '1' }))
        await repo.save(buildTable({ id: 'race', number: '2' }))
        await repo.save(buildTable({ id: 'reserved', number: '3', status: 'reservada' }))
    })

    afterAll(async () => {
        await db.close()
    })

    it('marks a free table as occupied and returns true', async () => {
        expect(await repo.occupy('free', '2030-01-01T00:00:00.000Z')).toBe(true)
        expect(await repo.findById('free')).toMatchObject({ status: 'ocupada', updatedAt: '2030-01-01T00:00:00.000Z' })
    })

    it('returns false and changes nothing when the table is not free', async () => {
        expect(await repo.occupy('free', '2031-01-01T00:00:00.000Z')).toBe(false)
        expect((await repo.findById('free'))?.updatedAt).toBe('2030-01-01T00:00:00.000Z')
        expect(await repo.occupy('reserved', '2031-01-01T00:00:00.000Z')).toBe(false)
        expect((await repo.findById('reserved'))?.status).toBe('reservada')
        expect(await repo.occupy('nope', '2031-01-01T00:00:00.000Z')).toBe(false)
    })

    it('lets only one of two simultaneous requests occupy the same table', async () => {
        const now = new Date().toISOString()
        const results = await Promise.all([repo.occupy('race', now), repo.occupy('race', now)])
        expect(results.filter(Boolean)).toHaveLength(1)
    })
})
