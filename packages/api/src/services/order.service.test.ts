import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Table } from '@models/table.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotOccupiedError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            tableNumber: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let orderRepository: MockOrderRepository
    let tableRepository: MockTableRepository
    let service: OrderService

    const items = [{ dishId: 'dish-1', quantity: 2, notes: 'Sin cebolla' }]

    function table(id: string, restaurantId: string, number: string, status: Table['status']): Table {
        const now = new Date().toISOString()
        return { id, restaurantId, number, description: null, capacity: 4, status, createdAt: now, updatedAt: now }
    }

    beforeEach(async () => {
        orderRepository = new MockOrderRepository()
        tableRepository = new MockTableRepository()
        service = new OrderService(orderRepository, tableRepository)
        await tableRepository.save(table('t-occupied', 'rest-1', '7', 'ocupada'))
        await tableRepository.save(table('t-free', 'rest-1', '8', 'libre'))
        await tableRepository.save(table('t-reserved', 'rest-1', '9', 'reservada'))
        await tableRepository.save(table('t-other', 'rest-2', '1', 'ocupada'))
    })

    it('creates the order linked to an occupied table of the restaurant', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: 't-occupied', clientId: 'c1', items })

        expect(order).toMatchObject({ restaurantId: 'rest-1', tableId: 't-occupied', tableNumber: '7', clientId: 'c1' })
        expect(order.items).toHaveLength(2)
        expect(orderRepository.orders).toHaveLength(1)
    })

    it('still accepts an order without table', async () => {
        const order = await service.create({ restaurantId: 'rest-1', tableId: null, clientId: 'c1', items })
        expect(order).toMatchObject({ tableId: null, tableNumber: null })
        expect(orderRepository.orders).toHaveLength(1)
    })

    it('rejects an unknown table', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 'nope', clientId: 'c1', items }))
            .rejects.toThrow(TableNotFoundError)
        expect(orderRepository.orders).toHaveLength(0)
    })

    it('rejects a table of another restaurant', async () => {
        await expect(service.create({ restaurantId: 'rest-1', tableId: 't-other', clientId: 'c1', items }))
            .rejects.toThrow(TableNotFoundError)
        expect(orderRepository.orders).toHaveLength(0)
    })

    it('rejects a table that is not occupied', async () => {
        for (const tableId of ['t-free', 't-reserved']) {
            await expect(service.create({ restaurantId: 'rest-1', tableId, clientId: 'c1', items }))
                .rejects.toThrow(TableNotOccupiedError)
        }
        await expect(service.create({ restaurantId: 'rest-1', tableId: 't-free', clientId: 'c1', items }))
            .rejects.toThrow('Table is not occupied')
        expect(orderRepository.orders).toHaveLength(0)
    })
})
