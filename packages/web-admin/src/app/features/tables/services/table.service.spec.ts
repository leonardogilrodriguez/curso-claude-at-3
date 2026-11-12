import { provideZonelessChangeDetection } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { TableService } from './table.service'
import { environment } from '../../../../environments/environment'
import type { CreateTableDto } from '../models/table.model'

const BASE = `${environment.apiUrl}/restaurants/r1/tables`
const dto: CreateTableDto = { number: '7', description: 'Terraza', capacity: 4, status: 'libre' }

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  it('getAll hace GET a las mesas del restaurante', () => {
    service.getAll('r1').subscribe()
    const req = http.expectOne(BASE)
    expect(req.request.method).toBe('GET')
    req.flush([])
  })

  it('getById hace GET a la mesa', () => {
    service.getById('r1', 't1').subscribe()
    const req = http.expectOne(`${BASE}/t1`)
    expect(req.request.method).toBe('GET')
    req.flush({})
  })

  it('create hace POST con el dto', () => {
    service.create('r1', dto).subscribe()
    const req = http.expectOne(BASE)
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(dto)
    req.flush({})
  })

  it('update hace PUT con el dto', () => {
    service.update('r1', 't1', dto).subscribe()
    const req = http.expectOne(`${BASE}/t1`)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(dto)
    req.flush({})
  })

  it('delete hace DELETE', () => {
    service.delete('r1', 't1').subscribe()
    const req = http.expectOne(`${BASE}/t1`)
    expect(req.request.method).toBe('DELETE')
    req.flush(null, { status: 204, statusText: 'No Content' })
  })
})
