import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { tableErrorMessage } from '../../table-errors'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''
  deleteError = signal<string | null>(null)

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante (misma ruta)
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.restaurantId = params.get('restaurantId') ?? ''
        this.deleteError.set(null)
        if (this.restaurantId) {
          this.store.loadByRestaurant(this.restaurantId)
        }
      })
  }

  async onDelete(id: string, number: string): Promise<void> {
    if (!this.restaurantId) return
    this.deleteError.set(null)
    if (!confirm(`¿Estás seguro de eliminar la mesa ${number}?`)) return
    try {
      await this.store.delete(this.restaurantId, id)
    } catch (err) {
      this.deleteError.set(tableErrorMessage(err, 'Error al eliminar la mesa.'))
    }
  }

  getStatusLabel(status: TableStatus): string {
    const labels: Record<TableStatus, string> = { libre: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada' }
    return labels[status] ?? status
  }
}
