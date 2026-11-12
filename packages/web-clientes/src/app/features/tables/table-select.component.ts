import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { Table } from '../../core/models/table.model'
import { CartStore } from '../../core/store/cart.store'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
          <p>Indica cuántas personas sois y selecciona una mesa disponible</p>
        </div>
      </div>

      <div class="card people-card">
        <label for="people">Número de personas</label>
        <input id="people" type="number" min="1" step="1" inputmode="numeric"
               [value]="people()" (input)="onPeopleInput($event)" />
      </div>

      @if (error()) {
        <div class="alert-error" role="alert">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (people() === null) {
        <div class="empty-state"><p>Introduce un número de personas válido (1 o más)</p></div>
      } @else if (tables().length === 0) {
        <div class="empty-state"><p>No hay mesas libres para {{ people() }} personas</p></div>
      } @else {
        <div class="tables-grid" role="radiogroup" aria-label="Mesas disponibles">
          @for (table of tables(); track table.id) {
            <button type="button" class="table-card card" role="radio"
                    [class.selected]="selectedId() === table.id"
                    [attr.aria-checked]="selectedId() === table.id"
                    (click)="select(table)">
              <strong>Mesa {{ table.number }}</strong>
              <span>{{ table.capacity }} personas</span>
              @if (table.description) {
                <span class="muted">{{ table.description }}</span>
              }
            </button>
          }
        </div>
      }

      <div class="actions">
        <button type="button" class="btn btn-primary" [disabled]="!selectedId() || occupying()"
                (click)="continue()">
          Continuar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .back-link { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; display: inline-block; }
    .people-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; margin-bottom: 20px; }
    .people-card input { width: 100px; }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .table-card {
      display: flex; flex-direction: column; gap: 4px; padding: 16px;
      text-align: left; cursor: pointer; border: 1px solid var(--border-color);
    }
    .table-card:hover { border-color: var(--green-medium); }
    .table-card.selected { border-color: var(--green-light); background: var(--green-glow); }
    .muted { color: var(--text-muted); font-size: 13px; }
    .actions { margin-top: 24px; display: flex; justify-content: flex-end; }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  protected restaurantId = ''
  readonly people = signal<number | null>(2)
  readonly tables = signal<Table[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    this.loadTables()
  }

  onPeopleInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value)
    this.people.set(Number.isInteger(value) && value >= 1 ? value : null)
    this.error.set(null)
    this.selectedId.set(null)
    this.loadTables()
  }

  select(table: Table): void {
    this.selectedId.set(table.id)
  }

  continue(): void {
    const table = this.tables().find(t => t.id === this.selectedId())
    if (!table || this.occupying()) return
    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, table.id).subscribe({
      next: (occupied) => {
        this.cartStore.setTable({
          id: occupied.id,
          number: occupied.number,
          restaurantId: this.restaurantId
        })
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.occupying.set(false)
        this.selectedId.set(null)
        if (err?.status === 409) {
          this.error.set('La mesa ya no está disponible. Elige otra de la lista actualizada.')
          this.loadTables()
        } else if (err?.status === 404) {
          this.error.set('La mesa no existe. Elige otra de la lista actualizada.')
          this.loadTables()
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }

  protected loadTables(): void {
    const people = this.people()
    if (people === null) {
      this.tables.set([])
      return
    }
    this.loading.set(true)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        if (!tables.some(t => t.id === this.selectedId())) this.selectedId.set(null)
        this.loading.set(false)
      },
      error: () => {
        this.tables.set([])
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }
}
