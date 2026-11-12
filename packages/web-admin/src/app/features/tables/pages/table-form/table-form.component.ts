import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { tableErrorMessage, tableErrorName } from '../../table-errors'
import { validateTable, type TableFormErrors } from './table-form.validation'
import type { TableStatus } from '../../models/table.model'

interface TableFormModel {
  number: string
  description: string | null
  capacity: number | null
  status: TableStatus
}

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  private readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  submitted = signal(false)
  errors = signal<TableFormErrors>({})
  private readonly errorSummary = viewChild<ElementRef<HTMLElement>>('errorSummary')

  errorList = () => {
    const e = this.errors()
    return [
      ...(e.number ? [{ field: 'table-number', message: e.number }] : []),
      ...(e.capacity ? [{ field: 'table-capacity', message: e.capacity }] : [])
    ]
  }

  statuses: { value: TableStatus; label: string }[] = [
    { value: 'libre', label: 'Libre' },
    { value: 'ocupada', label: 'Ocupada' },
    { value: 'reservada', label: 'Reservada' }
  ]

  form: TableFormModel = { number: '', description: null, capacity: null, status: 'libre' }

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')
    if (id && this.restaurantId) {
      this.isEditing = true
      this.tableId = id
      this.loadTable()
    }
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = {
        number: table.number,
        description: table.description,
        capacity: table.capacity,
        status: table.status
      }
    } catch {
      this.error.set('No se pudo cargar la mesa.')
    } finally {
      this.loading.set(false)
    }
  }

  focusField(event: Event, field: string): void {
    event.preventDefault()
    document.getElementById(field)?.focus()
  }

  private focusSummary(): void {
    setTimeout(() => this.errorSummary()?.nativeElement.focus())
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.submitted.set(true)
    const errors = validateTable(this.form)
    this.errors.set(errors)
    if (Object.keys(errors).length > 0) {
      this.focusSummary()
      return
    }
    const dto = {
      number: this.form.number.trim(),
      description: this.form.description?.trim() || null,
      capacity: Number(this.form.capacity),
      status: this.form.status
    }
    this.loading.set(true)
    try {
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err) {
      const message = tableErrorMessage(err, 'Error al guardar la mesa.')
      if (tableErrorName(err) === 'DuplicatedTableNumberError') {
        this.errors.set({ number: message })
        this.focusSummary()
      } else {
        this.error.set(message)
      }
    } finally {
      this.loading.set(false)
    }
  }
}
