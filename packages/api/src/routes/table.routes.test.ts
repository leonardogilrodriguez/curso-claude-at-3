import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

function token(role: string, restaurantId: string | null = null): string {
    return `Bearer ${jwt.sign({ id: `user-${role}`, role, restaurantId }, JWT_SECRET)}`
}

const admin = token('admin')
const manager = token('manager', 'rest-1')
const camarero = token('camarero', 'rest-1')
const cocinero = token('cocinero', 'rest-1')
const otherCamarero = token('camarero', 'rest-2')
const cliente = token('cliente')

const base = '/api/v1/restaurants/rest-1/tables'

describe('Table routes /api/v1/restaurants/:restaurantId/tables', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const now = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    let tableId: string

    describe('POST /', () => {
        it('creates a table with status libre (201) for admin', async () => {
            const res = await request(app).post(base).set('Authorization', admin)
                .send({ number: '7', description: 'Terraza', capacity: 4 })

            expect(res.status).toBe(201)
            expect(res.body).toMatchObject({ restaurantId: 'rest-1', number: '7', description: 'Terraza', capacity: 4, status: 'libre' })
            expect(Object.keys(res.body).sort()).toEqual(
                ['capacity', 'createdAt', 'description', 'id', 'number', 'restaurantId', 'status', 'updatedAt']
            )
            tableId = res.body.id
        })

        it('returns 400 DuplicatedTableNumberError for a repeated number', async () => {
            const res = await request(app).post(base).set('Authorization', admin).send({ number: '7', capacity: 2 })
            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'DuplicatedTableNumberError', message: 'Table number already exists in this restaurant' })
        })

        it('returns 400 for invalid data', async () => {
            const noNumber = await request(app).post(base).set('Authorization', admin).send({ capacity: 2 })
            expect(noNumber.status).toBe(400)
            expect(noNumber.body.error).toBe('TableNumberRequiredError')

            const badCapacity = await request(app).post(base).set('Authorization', admin).send({ number: '8', capacity: 0 })
            expect(badCapacity.status).toBe(400)
            expect(badCapacity.body.error).toBe('InvalidTableCapacityError')
        })

        it('returns 404 when the restaurant does not exist', async () => {
            const res = await request(app).post('/api/v1/restaurants/nope/tables').set('Authorization', admin).send({ number: '1', capacity: 2 })
            expect(res.status).toBe(404)
            expect(res.body.error).toBe('RestaurantNotFoundError')
        })

        it('returns 401 without token and 403 for roles other than admin', async () => {
            expect((await request(app).post(base).send({ number: '9', capacity: 2 })).status).toBe(401)
            for (const auth of [manager, camarero, cocinero, cliente]) {
                expect((await request(app).post(base).set('Authorization', auth).send({ number: '9', capacity: 2 })).status).toBe(403)
            }
        })
    })

    describe('GET / and GET /:tableId', () => {
        it('lists the tables for admin, manager, camarero and cocinero', async () => {
            for (const auth of [admin, manager, camarero, cocinero]) {
                const res = await request(app).get(base).set('Authorization', auth)
                expect(res.status).toBe(200)
                expect(res.body.map((t: { number: string }) => t.number)).toEqual(['7'])
            }
        })

        it('returns the table by id', async () => {
            const res = await request(app).get(`${base}/${tableId}`).set('Authorization', cocinero)
            expect(res.status).toBe(200)
            expect(res.body.id).toBe(tableId)
        })

        it('returns 404 TableNotFoundError for an unknown table or restaurant', async () => {
            const res = await request(app).get('/api/v1/restaurants/nope/tables/x').set('Authorization', admin)
            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'TableNotFoundError', message: 'Table not found' })
            expect((await request(app).get(`/api/v1/restaurants/rest-2/tables/${tableId}`).set('Authorization', admin)).status).toBe(404)
        })

        it('returns 403 for a cliente and for an employee of another restaurant', async () => {
            expect((await request(app).get(base).set('Authorization', cliente)).status).toBe(403)
            const res = await request(app).get(base).set('Authorization', otherCamarero)
            expect(res.status).toBe(403)
            expect(res.body.error).toMatch(/^Forbidden/)
        })
    })

    describe('PUT /:tableId', () => {
        it('updates the table for admin and keeps the status when omitted', async () => {
            const res = await request(app).put(`${base}/${tableId}`).set('Authorization', admin)
                .send({ number: '7', description: 'Terraza cubierta', capacity: 6 })
            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ description: 'Terraza cubierta', capacity: 6, status: 'libre' })
        })

        it('returns 400, 403 and 404 when appropriate', async () => {
            expect((await request(app).put(`${base}/${tableId}`).set('Authorization', admin).send({ number: '7', capacity: 4, status: 'x' })).status).toBe(400)
            expect((await request(app).put(`${base}/${tableId}`).set('Authorization', manager).send({ number: '7', capacity: 4 })).status).toBe(403)
            expect((await request(app).put(`${base}/nope`).set('Authorization', admin).send({ number: '7', capacity: 4 })).status).toBe(404)
        })
    })

    describe('PATCH /:tableId/status', () => {
        it('changes the status for admin, manager and camarero', async () => {
            for (const [auth, status] of [[admin, 'reservada'], [manager, 'ocupada'], [camarero, 'libre']] as const) {
                const res = await request(app).patch(`${base}/${tableId}/status`).set('Authorization', auth).send({ status })
                expect(res.status).toBe(200)
                expect(res.body.status).toBe(status)
            }
        })

        it('returns 400 InvalidTableStatusError for an invalid status', async () => {
            const res = await request(app).patch(`${base}/${tableId}/status`).set('Authorization', camarero).send({ status: 'cerrada' })
            expect(res.status).toBe(400)
            expect(res.body.error).toBe('InvalidTableStatusError')
        })

        it('returns 403 for cocinero, cliente and other restaurants, and 404 for unknown tables', async () => {
            for (const auth of [cocinero, cliente, otherCamarero]) {
                expect((await request(app).patch(`${base}/${tableId}/status`).set('Authorization', auth).send({ status: 'libre' })).status).toBe(403)
            }
            expect((await request(app).patch(`${base}/nope/status`).set('Authorization', camarero).send({ status: 'libre' })).status).toBe(404)
        })
    })

    describe('DELETE /:tableId', () => {
        it('returns 409 TableOccupiedError for an occupied table', async () => {
            await request(app).patch(`${base}/${tableId}/status`).set('Authorization', admin).send({ status: 'ocupada' })
            const res = await request(app).delete(`${base}/${tableId}`).set('Authorization', admin)
            expect(res.status).toBe(409)
            expect(res.body).toEqual({ error: 'TableOccupiedError', message: 'An occupied table cannot be deleted' })
        })

        it('returns 403 for roles other than admin', async () => {
            expect((await request(app).delete(`${base}/${tableId}`).set('Authorization', manager)).status).toBe(403)
        })

        it('deletes a free table (204) and then returns 404', async () => {
            await request(app).patch(`${base}/${tableId}/status`).set('Authorization', admin).send({ status: 'libre' })
            const res = await request(app).delete(`${base}/${tableId}`).set('Authorization', admin)
            expect(res.status).toBe(204)
            expect(res.text).toBe('')
            expect((await request(app).delete(`${base}/${tableId}`).set('Authorization', admin)).status).toBe(404)
        })
    })
})
