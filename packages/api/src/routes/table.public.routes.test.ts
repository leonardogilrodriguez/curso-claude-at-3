import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

function token(role: string, restaurantId: string | null = null): string {
    return `Bearer ${jwt.sign({ id: `user-${role}`, role, restaurantId }, JWT_SECRET)}`
}

const cliente = token('cliente')
const camarero = token('camarero', 'rest-1')

const base = '/api/v1/public/restaurants/rest-1/tables'

async function insertTable(id: string, restaurantId: string, number: string, capacity: number, status: string) {
    const now = new Date().toISOString()
    await dbConfig.run(
        'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, restaurantId, number, null, capacity, status, now, now]
    )
}

describe('Public table routes /api/v1/public/restaurants/:restaurantId/tables', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const now = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
        await insertTable('t1', 'rest-1', '1', 2, 'libre')
        await insertTable('t2', 'rest-1', '2', 6, 'libre')
        await insertTable('t3', 'rest-1', '3', 8, 'ocupada')
        await insertTable('t4', 'rest-1', '4', 8, 'reservada')
        await insertTable('t5', 'rest-1', '5', 5, 'libre')
        await insertTable('race', 'rest-1', '6', 4, 'libre')
        await insertTable('other', 'rest-2', '1', 10, 'libre')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    describe('GET /available', () => {
        it('returns only free tables with enough capacity without a token', async () => {
            const res = await request(app).get(`${base}/available`).query({ people: 5 })
            expect(res.status).toBe(200)
            expect(res.body.map((t: { id: string }) => t.id)).toEqual(['t5', 't2'])
            expect(res.body.every((t: { status: string, capacity: number }) => t.status === 'libre' && t.capacity >= 5)).toBe(true)
        })

        it('returns an empty list for an unknown restaurant', async () => {
            const res = await request(app).get('/api/v1/public/restaurants/nope/tables/available?people=1')
            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })

        it('returns 400 InvalidPeopleCountError when people is missing or invalid', async () => {
            for (const query of ['', '?people=0', '?people=abc', '?people=2.5']) {
                const res = await request(app).get(`${base}/available${query}`)
                expect(res.status).toBe(400)
                expect(res.body).toEqual({ error: 'InvalidPeopleCountError', message: 'People must be an integer greater than or equal to 1' })
            }
        })
    })

    describe('POST /:tableId/occupy', () => {
        it('occupies a free table for a cliente (200)', async () => {
            const res = await request(app).post(`${base}/t1/occupy`).set('Authorization', cliente)
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: 't1', number: '1', status: 'ocupada' })
        })

        it('returns 409 TableNotAvailableError when the table is not free', async () => {
            for (const id of ['t1', 't3', 't4']) {
                const res = await request(app).post(`${base}/${id}/occupy`).set('Authorization', cliente)
                expect(res.status).toBe(409)
                expect(res.body).toEqual({ error: 'TableNotAvailableError', message: 'Table is not available' })
            }
        })

        it('lets only one of two simultaneous requests occupy the same table', async () => {
            const statuses = (await Promise.all([
                request(app).post(`${base}/race/occupy`).set('Authorization', cliente),
                request(app).post(`${base}/race/occupy`).set('Authorization', cliente)
            ])).map(r => r.status).sort()
            expect(statuses).toEqual([200, 409])
        })

        it('returns 404 for an unknown table or a table of another restaurant', async () => {
            expect((await request(app).post(`${base}/nope/occupy`).set('Authorization', cliente)).status).toBe(404)
            const res = await request(app).post(`${base}/other/occupy`).set('Authorization', cliente)
            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })

        it('returns 401 without token and 403 for roles other than cliente', async () => {
            expect((await request(app).post(`${base}/t2/occupy`)).status).toBe(401)
            expect((await request(app).post(`${base}/t2/occupy`).set('Authorization', camarero)).status).toBe(403)
        })
    })
})
