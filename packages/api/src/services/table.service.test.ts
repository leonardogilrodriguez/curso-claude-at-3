import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    TableNumberRequiredError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    RestaurantNotFoundError,
    TableNotFoundError,
    TableOccupiedError,
    InvalidPeopleCountError,
    TableNotAvailableError
} from '@errors/DomainErrors.js'

async function buildService() {
    const tableRepository = new MockTableRepository()
    const restaurantRepository = new MockRestaurantRepository()
    const now = new Date().toISOString()
    for (const id of ['rest-1', 'rest-2']) {
        await restaurantRepository.save({
            id, name: id, address: 'Calle Mayor 1', email: `${id}@resttek.com`, phone: '+34 600000000',
            ownerFirstName: 'Ana', ownerLastName: 'López', logoUrl: null, createdAt: now, updatedAt: now
        })
    }
    return { service: new TableService(tableRepository, restaurantRepository), tableRepository }
}

describe('TableService.create', () => {
    let service: TableService
    let tableRepository: MockTableRepository

    beforeEach(async () => {
        ({ service, tableRepository } = await buildService())
    })

    it('creates a table with status libre by default', async () => {
        const table = await service.create('rest-1', { number: ' 7 ', description: 'Terraza', capacity: 4 })

        expect(table).toMatchObject({ restaurantId: 'rest-1', number: '7', description: 'Terraza', capacity: 4, status: 'libre' })
        expect(table.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(table.createdAt).toBe(table.updatedAt)
        expect(tableRepository.tables).toHaveLength(1)
    })

    it('accepts an explicit status and normalizes it', async () => {
        const table = await service.create('rest-1', { number: '8', capacity: 2, status: ' Reservada ' })
        expect(table.status).toBe('reservada')
        expect(table.description).toBeNull()
    })

    it('converts a numeric number to text and an empty description to null', async () => {
        const table = await service.create('rest-1', { number: 9 as unknown as string, description: '  ', capacity: 2 })
        expect(table.number).toBe('9')
        expect(table.description).toBeNull()
    })

    it('requires the number', async () => {
        await expect(service.create('rest-1', { number: '  ', capacity: 4 })).rejects.toThrow(TableNumberRequiredError)
        await expect(service.create('rest-1', { number: undefined as unknown as string, capacity: 4 })).rejects.toThrow(TableNumberRequiredError)
    })

    it('requires an integer capacity >= 1', async () => {
        for (const capacity of [0, -2, 2.5, undefined, '4']) {
            await expect(service.create('rest-1', { number: '1', capacity: capacity as unknown as number }))
                .rejects.toThrow(InvalidTableCapacityError)
        }
    })

    it('rejects an invalid status', async () => {
        await expect(service.create('rest-1', { number: '1', capacity: 4, status: 'cerrada' })).rejects.toThrow(InvalidTableStatusError)
    })

    it('rejects a duplicated number in the same restaurant but allows it in another one', async () => {
        await service.create('rest-1', { number: '7', capacity: 4 })
        await expect(service.create('rest-1', { number: '7', capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        await expect(service.create('rest-2', { number: '7', capacity: 2 })).resolves.toMatchObject({ number: '7' })
    })

    it('throws RestaurantNotFoundError when the restaurant does not exist', async () => {
        await expect(service.create('nope', { number: '1', capacity: 4 })).rejects.toThrow(RestaurantNotFoundError)
    })
})

describe('TableService read, update and delete', () => {
    let service: TableService
    let tableId: string

    beforeEach(async () => {
        ({ service } = await buildService())
        tableId = (await service.create('rest-1', { number: '7', description: 'Terraza', capacity: 4 })).id
        await service.create('rest-1', { number: '2', capacity: 2 })
        await service.create('rest-2', { number: '1', capacity: 2 })
    })

    it('lists the tables of a restaurant', async () => {
        const tables = await service.findByRestaurantId('rest-1')
        expect(tables.map(t => t.number)).toEqual(['2', '7'])
    })

    it('finds a table of the restaurant by id', async () => {
        expect((await service.findById('rest-1', tableId)).number).toBe('7')
    })

    it('throws TableNotFoundError for a missing table or a table of another restaurant', async () => {
        await expect(service.findById('rest-1', 'nope')).rejects.toThrow(TableNotFoundError)
        await expect(service.findById('rest-2', tableId)).rejects.toThrow(TableNotFoundError)
    })

    it('updates number, description, capacity and status', async () => {
        const updated = await service.update('rest-1', tableId, { number: '70', description: 'Terraza cubierta', capacity: 6, status: 'reservada' })
        expect(updated).toMatchObject({ id: tableId, number: '70', description: 'Terraza cubierta', capacity: 6, status: 'reservada' })
        expect((await service.findById('rest-1', tableId)).number).toBe('70')
    })

    it('keeps the current status when it is not sent and clears a missing description', async () => {
        await service.update('rest-1', tableId, { number: '7', capacity: 4, status: 'ocupada' })
        const updated = await service.update('rest-1', tableId, { number: '7', capacity: 5 })
        expect(updated.status).toBe('ocupada')
        expect(updated.description).toBeNull()
    })

    it('validates the update like the creation', async () => {
        await expect(service.update('rest-1', tableId, { number: '', capacity: 4 })).rejects.toThrow(TableNumberRequiredError)
        await expect(service.update('rest-1', tableId, { number: '7', capacity: 0 })).rejects.toThrow(InvalidTableCapacityError)
        await expect(service.update('rest-1', tableId, { number: '7', capacity: 4, status: 'x' })).rejects.toThrow(InvalidTableStatusError)
        await expect(service.update('rest-1', tableId, { number: '2', capacity: 4 })).rejects.toThrow(DuplicatedTableNumberError)
    })

    it('throws TableNotFoundError when updating a table of another restaurant', async () => {
        await expect(service.update('rest-2', tableId, { number: '7', capacity: 4 })).rejects.toThrow(TableNotFoundError)
    })

    it('deletes a free or reserved table', async () => {
        await service.delete('rest-1', tableId)
        await expect(service.findById('rest-1', tableId)).rejects.toThrow(TableNotFoundError)
    })

    it('does not delete an occupied table', async () => {
        await service.update('rest-1', tableId, { number: '7', capacity: 4, status: 'ocupada' })
        await expect(service.delete('rest-1', tableId)).rejects.toThrow(TableOccupiedError)
        expect((await service.findById('rest-1', tableId)).status).toBe('ocupada')
    })

    it('throws TableNotFoundError when deleting a table of another restaurant', async () => {
        await expect(service.delete('rest-2', tableId)).rejects.toThrow(TableNotFoundError)
    })
})

describe('TableService.changeStatus', () => {
    let service: TableService
    let tableId: string

    beforeEach(async () => {
        ({ service } = await buildService())
        tableId = (await service.create('rest-1', { number: '7', capacity: 4 })).id
    })

    it('allows every transition between libre, ocupada and reservada', async () => {
        const transitions = ['ocupada', 'libre', 'reservada', 'ocupada', 'reservada', 'libre'] as const
        for (const status of transitions) {
            const table = await service.changeStatus('rest-1', tableId, status)
            expect(table.status).toBe(status)
            expect((await service.findById('rest-1', tableId)).status).toBe(status)
        }
    })

    it('accepts the same status and normalizes the value', async () => {
        expect((await service.changeStatus('rest-1', tableId, ' LIBRE ')).status).toBe('libre')
    })

    it('updates updatedAt', async () => {
        const before = await service.findById('rest-1', tableId)
        await new Promise(resolve => setTimeout(resolve, 5))
        const after = await service.changeStatus('rest-1', tableId, 'ocupada')
        expect(after.updatedAt > before.updatedAt).toBe(true)
        expect(after.createdAt).toBe(before.createdAt)
    })

    it('rejects an invalid status', async () => {
        await expect(service.changeStatus('rest-1', tableId, 'cerrada')).rejects.toThrow(InvalidTableStatusError)
        await expect(service.changeStatus('rest-1', tableId, undefined as unknown as string)).rejects.toThrow(InvalidTableStatusError)
    })

    it('throws TableNotFoundError for a missing table or a table of another restaurant', async () => {
        await expect(service.changeStatus('rest-1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        await expect(service.changeStatus('rest-2', tableId, 'libre')).rejects.toThrow(TableNotFoundError)
    })
})

describe('TableService.findAvailable', () => {
    let service: TableService

    beforeEach(async () => {
        ({ service } = await buildService())
        await service.create('rest-1', { number: '1', capacity: 2 })
        await service.create('rest-1', { number: '2', capacity: 6 })
        await service.create('rest-1', { number: '3', capacity: 4 })
        await service.create('rest-1', { number: '4', capacity: 4 })
        await service.create('rest-1', { number: '5', capacity: 8, status: 'ocupada' })
        await service.create('rest-1', { number: '6', capacity: 8, status: 'reservada' })
        await service.create('rest-1', { number: '10', capacity: 4 })
        await service.create('rest-2', { number: '1', capacity: 10 })
    })

    it('returns only free tables of the restaurant with enough capacity', async () => {
        const tables = await service.findAvailable('rest-1', 5)
        expect(tables.map(t => t.number)).toEqual(['2'])
        expect(tables.every(t => t.status === 'libre' && t.restaurantId === 'rest-1')).toBe(true)
    })

    it('orders by capacity ascending and then by number', async () => {
        const tables = await service.findAvailable('rest-1', 3)
        expect(tables.map(t => `${t.number}:${t.capacity}`)).toEqual(['3:4', '4:4', '10:4', '2:6'])
    })

    it('includes tables whose capacity equals the number of people', async () => {
        expect((await service.findAvailable('rest-1', 2)).map(t => t.number)).toEqual(['1', '3', '4', '10', '2'])
    })

    it('returns an empty list when nothing fits or the restaurant does not exist', async () => {
        expect(await service.findAvailable('rest-1', 9)).toEqual([])
        expect(await service.findAvailable('nope', 1)).toEqual([])
    })

    it('throws InvalidPeopleCountError when people is not an integer >= 1', async () => {
        for (const people of [0, -1, 2.5, Number.NaN, undefined]) {
            await expect(service.findAvailable('rest-1', people as unknown as number)).rejects.toThrow(InvalidPeopleCountError)
        }
    })
})

describe('TableService.occupy', () => {
    let service: TableService
    let tableRepository: MockTableRepository
    let tableId: string

    beforeEach(async () => {
        ({ service, tableRepository } = await buildService())
        tableId = (await service.create('rest-1', { number: '7', capacity: 4 })).id
    })

    it('turns a free table into an occupied one', async () => {
        const table = await service.occupy('rest-1', tableId)
        expect(table).toMatchObject({ id: tableId, status: 'ocupada' })
        expect((await service.findById('rest-1', tableId)).status).toBe('ocupada')
    })

    it('throws TableNotAvailableError when the table is occupied or reserved', async () => {
        await service.occupy('rest-1', tableId)
        await expect(service.occupy('rest-1', tableId)).rejects.toThrow(TableNotAvailableError)

        await service.changeStatus('rest-1', tableId, 'reservada')
        await expect(service.occupy('rest-1', tableId)).rejects.toThrow(TableNotAvailableError)
    })

    it('relies on the conditional update of the repository', async () => {
        // The table looks free when it is read, but another request occupies it first.
        tableRepository.occupy = async () => false
        await expect(service.occupy('rest-1', tableId)).rejects.toThrow(TableNotAvailableError)
    })

    it('throws TableNotFoundError for a missing table or a table of another restaurant', async () => {
        await expect(service.occupy('rest-1', 'nope')).rejects.toThrow(TableNotFoundError)
        await expect(service.occupy('rest-2', tableId)).rejects.toThrow(TableNotFoundError)
    })
})
