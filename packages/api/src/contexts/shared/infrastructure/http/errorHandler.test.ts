import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    TableNotAvailableError,
    TableOccupiedError,
    TableNumberRequiredError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    InvalidPeopleCountError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

function run(err: unknown) {
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    } as unknown as Response
    errorHandler(err, {} as Request, res, (() => {}) as NextFunction)
    return res as unknown as { status: ReturnType<typeof vi.fn>, json: ReturnType<typeof vi.fn> }
}

describe('errorHandler with table errors', () => {
    it('maps TableNotFoundError to 404', () => {
        const res = run(new TableNotFoundError())
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('keeps RestaurantNotFoundError as 404', () => {
        expect(run(new RestaurantNotFoundError()).status).toHaveBeenCalledWith(404)
    })

    it('maps TableNotAvailableError and TableOccupiedError to 409', () => {
        const notAvailable = run(new TableNotAvailableError())
        expect(notAvailable.status).toHaveBeenCalledWith(409)
        expect(notAvailable.json).toHaveBeenCalledWith({ error: 'TableNotAvailableError', message: 'Table is not available' })

        const occupied = run(new TableOccupiedError())
        expect(occupied.status).toHaveBeenCalledWith(409)
        expect(occupied.json).toHaveBeenCalledWith({ error: 'TableOccupiedError', message: 'An occupied table cannot be deleted' })
    })

    it('maps table validation errors to 400', () => {
        const errors = [
            new TableNumberRequiredError(),
            new InvalidTableCapacityError(),
            new InvalidTableStatusError(),
            new DuplicatedTableNumberError(),
            new InvalidPeopleCountError()
        ]
        for (const err of errors) {
            const res = run(err)
            expect(res.status).toHaveBeenCalledWith(400)
            expect(res.json).toHaveBeenCalledWith({ error: err.name, message: err.message })
        }
    })

    it('uses the messages documented in the contract', () => {
        expect(new TableNumberRequiredError().message).toBe('Table number is required')
        expect(new InvalidTableCapacityError().message).toBe('Capacity must be an integer greater than or equal to 1')
        expect(new DuplicatedTableNumberError().message).toBe('Table number already exists in this restaurant')
        expect(new InvalidPeopleCountError().message).toBe('People must be an integer greater than or equal to 1')
    })
})
