import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { OrderStore } from '../../../orders/store/order.store';
import { TableStore } from '../../store/table.store';
import { Order } from '../../../orders/models/order.model';
import { TABLE_STATUSES, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly orderStore = inject(OrderStore);

  readonly statuses = TABLE_STATUSES;

  readonly ordersByTable = computed(() => {
    const map = new Map<string, Order[]>();
    for (const order of this.orderStore.orders()) {
      if (!order.tableId) continue;
      map.set(order.tableId, [...(map.get(order.tableId) ?? []), order]);
    }
    return map;
  });

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
      this.orderStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  changeStatus(tableId: string, status: TableStatus): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.updateStatus(restaurantId, tableId, status);
    }
  }
}
