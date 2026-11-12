import { describe, it, expect } from 'vitest'
import { normalizeTableStatus, VALID_TABLE_STATUSES } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('accepts every valid status', () => {
        expect(VALID_TABLE_STATUSES).toEqual(['libre', 'ocupada', 'reservada'])
        for (const status of VALID_TABLE_STATUSES) {
            expect(normalizeTableStatus(status)).toBe(status)
        }
    })

    it('normalizes upper case and surrounding spaces', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
        expect(normalizeTableStatus('Reservada')).toBe('reservada')
    })

    it('throws InvalidTableStatusError for an unknown status', () => {
        expect(() => normalizeTableStatus('cerrada')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('cerrada')).toThrow('Invalid table status: cerrada. Must be one of: libre, ocupada, reservada')
    })

    it('throws InvalidTableStatusError for a non string value', () => {
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
