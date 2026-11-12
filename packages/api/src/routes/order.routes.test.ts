import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const cliente = `Bearer ${jwt.sign({ id: 'client-1', role: 'cliente', restaurantId: null }, JWT_SECRET)}`

describe('POST /api/v1/orders with tableId', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const now = new Date().toISOString()
        for (const id of ['rest-1', 'rest-2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'Calle Mayor 10', `${id}@resttek.com`, '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
        await dbConfig.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['dish-1', 'Pizza', null, 9.5, 'principal', 1, 'rest-1', now, now]
        )
        const insertTable = 'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        await dbConfig.run(insertTable, ['t-occupied', 'rest-1', '4', null, 4, 'ocupada', now, now])
        await dbConfig.run(insertTable, ['t-free', 'rest-1', '5', null, 4, 'libre', now, now])
        await dbConfig.run(insertTable, ['t-other', 'rest-2', '1', null, 4, 'ocupada', now, now])
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const items = [{ dishId: 'dish-1', quantity: 2, notes: 'Sin cebolla' }]

    it('creates an order for an occupied table and returns tableNumber (201)', async () => {
        const res = await request(app).post('/api/v1/orders').set('Authorization', cliente)
            .send({ restaurantId: 'rest-1', tableId: 't-occupied', items })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ restaurantId: 'rest-1', tableId: 't-occupied', tableNumber: '4', clientId: 'client-1' })
        expect(res.body.items).toHaveLength(2)

        const active = await request(app).get('/api/v1/orders/active?restaurantId=rest-1').set('Authorization', cliente)
        expect(active.body[0]).toMatchObject({ tableId: 't-occupied', tableNumber: '4' })
    })

    it('still creates an order without tableId', async () => {
        const res = await request(app).post('/api/v1/orders').set('Authorization', cliente)
            .send({ restaurantId: 'rest-1', items })
        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ tableId: null, tableNumber: null })
    })

    it('returns 400 { error } for a table of another restaurant, unknown or not occupied', async () => {
        const cases: [string, string][] = [['t-other', 'Table not found'], ['nope', 'Table not found'], ['t-free', 'Table is not occupied']]
        for (const [tableId, message] of cases) {
            const res = await request(app).post('/api/v1/orders').set('Authorization', cliente)
                .send({ restaurantId: 'rest-1', tableId, items })
            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: message })
        }
    })
})
