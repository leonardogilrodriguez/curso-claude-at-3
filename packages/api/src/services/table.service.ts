import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    TableNumberRequiredError,
    InvalidTableCapacityError,
    DuplicatedTableNumberError,
    RestaurantNotFoundError,
    TableNotFoundError,
    TableOccupiedError,
    InvalidPeopleCountError
} from '@errors/DomainErrors.js'

export interface TableInput {
    number: string
    description?: string | null
    capacity: number
    status?: string
}

interface ValidatedTableInput {
    number: string
    description: string | null
    capacity: number
    status: TableStatusType | undefined
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, input: TableInput): Promise<Table> {
        const data = this.validate(input)

        const restaurant = await this.restaurantRepository.findById(restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }
        await this.ensureNumberIsFree(restaurantId, data.number)

        const now = new Date().toISOString()
        const table: Table = {
            id: randomUUID(),
            restaurantId,
            number: data.number,
            description: data.description,
            capacity: data.capacity,
            status: data.status ?? 'libre',
            createdAt: now,
            updatedAt: now
        }
        await this.tableRepository.save(table)
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, tableId: string): Promise<Table> {
        const table = await this.tableRepository.findById(tableId)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, tableId: string, input: TableInput): Promise<Table> {
        const current = await this.findById(restaurantId, tableId)
        const data = this.validate(input)
        await this.ensureNumberIsFree(restaurantId, data.number, tableId)

        const table: Table = {
            ...current,
            number: data.number,
            description: data.description,
            capacity: data.capacity,
            status: data.status ?? current.status,
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.save(table)
        return table
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        if (typeof people !== 'number' || !Number.isInteger(people) || people < 1) {
            throw new InvalidPeopleCountError()
        }
        const tables = await this.tableRepository.findByRestaurantId(restaurantId)
        // The repository already returns the tables ordered by number and sort() is stable,
        // so ties in capacity keep the number order.
        return tables
            .filter(t => t.status === 'libre' && t.capacity >= people)
            .sort((a, b) => a.capacity - b.capacity)
    }

    async changeStatus(restaurantId: string, tableId: string, status: string): Promise<Table> {
        const current = await this.findById(restaurantId, tableId)
        const table: Table = {
            ...current,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }
        await this.tableRepository.save(table)
        return table
    }

    async delete(restaurantId: string, tableId: string): Promise<void> {
        const table = await this.findById(restaurantId, tableId)
        if (table.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(tableId)
    }

    private validate(input: TableInput): ValidatedTableInput {
        const rawNumber = input.number as unknown
        const number = typeof rawNumber === 'string' || typeof rawNumber === 'number' ? String(rawNumber).trim() : ''
        if (number === '') {
            throw new TableNumberRequiredError()
        }

        if (typeof input.capacity !== 'number' || !Number.isInteger(input.capacity) || input.capacity < 1) {
            throw new InvalidTableCapacityError()
        }

        const description = typeof input.description === 'string' && input.description.trim() !== ''
            ? input.description.trim()
            : null

        const status = input.status === undefined || input.status === null
            ? undefined
            : normalizeTableStatus(input.status)

        return { number, description, capacity: input.capacity, status }
    }

    private async ensureNumberIsFree(restaurantId: string, number: string, exceptTableId?: string): Promise<void> {
        const existing = await this.tableRepository.findByNumber(restaurantId, number)
        if (existing && existing.id !== exceptTableId) {
            throw new DuplicatedTableNumberError()
        }
    }
}
