# Plan: Sistema de puntos para clientes

- **Issue:** #7
- **Tipo:** feature
- **Fecha:** 2026-11-11

## Objetivo

Que los clientes acumulen puntos por lo que gastan: por cada X€ gastados se llevan Y puntos. Los puntos se registran en un libro de movimientos (ledger) por cliente y restaurante, y se exponen por API para que el plan 8 (descuentos) pueda canjearlos.

## Alcance

### Incluido

- Configuración de puntos por restaurante: `eurosPerBlock` (X) y `pointsPerBlock` (Y), con valores por defecto.
- Tabla `points_transactions` (movimientos de tipo `earn`/`redeem`) y cálculo del saldo.
- Acumulación automática cuando un pedido queda totalmente entregado (`isOrderFullyDelivered`), una sola vez por pedido.
- Endpoints: `GET /points/mine` (saldo y movimientos del cliente) y `GET/PUT /restaurants/:restaurantId/points-config` (admin/manager).
- Servicio con método `redeem()` reutilizable por el plan 8.
- Tests Vitest de todo lo anterior y actualización de `modelo-datos.md`.

### Fuera de alcance

- Pantallas en los frontends (web-clientes para ver puntos, web-admin para la configuración); se plantearán en una issue aparte o se cubren en el plan 8 al canjear.
- Caducidad de puntos y niveles de fidelidad.
- Canje de puntos por descuentos (plan 8).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | Crear tablas `points_config` y `points_transactions` en `runInitialMigrations()` (`CREATE TABLE IF NOT EXISTS`; no altera una BD existente con tablas, pero estas son nuevas). |
| `packages/api/src/models/points.model.ts` | crear | Interfaces, `calculatePoints()` y validación de la configuración. |
| `packages/api/src/models/points.model.test.ts` | crear | Tests del cálculo de puntos. |
| `packages/api/src/repositories/points.repository.ts` | crear | Interfaz y implementación SQLite (config y movimientos). |
| `packages/api/src/repositories/mocks/MockPointsRepository.ts` | crear | Mock en memoria para tests de servicio. |
| `packages/api/src/services/points.service.ts` | crear | `earnForOrder`, `getBalance`, `redeem`, `getConfig`, `setConfig`. |
| `packages/api/src/services/points.service.test.ts` | crear | Tests del servicio. |
| `packages/api/src/services/order.service.ts` | modificar | Al marcar el último item `entregado`, llamar a `earnForOrder`. |
| `packages/api/src/services/order.service.test.ts` | modificar | Tests de la acumulación al entregar el pedido. |
| `packages/api/src/controllers/points.controller.ts` | crear | Handlers HTTP. |
| `packages/api/src/routes/points.routes.ts` | crear | Rutas y autorización; cableado manual de dependencias. |
| `packages/api/src/routes/points.routes.test.ts` | crear | Tests supertest de endpoints y roles. |
| `packages/api/src/errors/DomainErrors.ts` | modificar | `InvalidPointsConfigError`, `InsufficientPointsError`. |
| `packages/api/src/app.ts` | modificar | Montar las rutas de puntos. |
| `packages/api/src/scripts/seed.ts` | modificar | Configuración de puntos por defecto en los restaurantes demo. |
| `docs/dominio/modelo-datos.md` | modificar | Documentar las tablas nuevas. |
| `packages/api/openapi.yaml` | modificar | Documentar endpoints (solo si el plan 6 ya está hecho). |

## Tareas

Cada tarea empieza por los tests (Vitest) y termina con el código que los pone en verde.

1. [ ] Tests de `calculatePoints(total, config)`: 0€ → 0; 9,99€ con X=10,Y=1 → 0; 25€ → 2 (redondeo hacia abajo por bloques completos); config inválida (X ≤ 0, Y < 0) → error. Implementar en — `packages/api/src/models/points.model.ts` (~8 min)
2. [ ] Crear las tablas `points_config` (restaurant_id PK, euros_per_block, points_per_block) y `points_transactions` (id, client_id, restaurant_id, order_id nullable, type, points, created_at) con test de esquema en BD `:memory:` — `packages/api/src/config/database.ts` (~8 min)
3. [ ] Tests del repositorio SQLite (config por defecto si no existe, guardar/leer config, insertar movimiento, saldo = suma earn − redeem, existe movimiento `earn` por order_id) e implementarlo con su mock — `packages/api/src/repositories/points.repository.ts` (~10 min)
4. [ ] Tests de `PointsService.earnForOrder`: calcula con el total del pedido (precio × cantidad de items), usa la config del restaurante, no duplica si el pedido ya sumó, ignora pedidos sin `clientId`; implementarlo — `packages/api/src/services/points.service.ts` (~10 min)
5. [ ] Tests de `getBalance` y `redeem` (descuenta, falla con `InsufficientPointsError` si no hay saldo, no permite puntos ≤ 0); implementarlos — `packages/api/src/services/points.service.ts` (~8 min)
6. [ ] Tests en `OrderService.updateItemStatus`: al pasar el último item a `entregado` se llama a `earnForOrder` una vez; con items pendientes no se llama. Inyectar `PointsService` en `OrderService` y llamarlo — `packages/api/src/services/order.service.ts` (~10 min)
7. [ ] Tests supertest de `GET /points/mine` (cliente autenticado; 401 sin token) e implementar controlador y ruta — `packages/api/src/routes/points.routes.ts` (~8 min)
8. [ ] Tests supertest de `GET/PUT /restaurants/:restaurantId/points-config` (solo admin/manager; manager de otro restaurante → 403; datos inválidos → 400) e implementarlos — `packages/api/src/controllers/points.controller.ts` (~10 min)
9. [ ] Montar rutas en `app.ts`, añadir errores al `errorHandler` si procede, seed con config por defecto y actualizar `modelo-datos.md` — `packages/api/src/app.ts` (~8 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa con los tests nuevos de puntos y los 66 existentes.
- [ ] Con X=10 e Y=1, un pedido de 25€ marcado todo `entregado` suma 2 puntos: `GET /api/v1/points/mine` con el token del cliente devuelve `balance: 2`.
- [ ] Volver a marcar items como `entregado` en el mismo pedido no suma puntos otra vez.
- [ ] `PUT /api/v1/restaurants/rest-1/points-config` con `{ "eurosPerBlock": 5, "pointsPerBlock": 1 }` como admin devuelve 200; como camarero devuelve 403.
- [ ] `PointsService.redeem` con más puntos que el saldo lanza `InsufficientPointsError`.
- [ ] `docs/dominio/modelo-datos.md` describe las tablas nuevas.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Ledger de movimientos en lugar de un campo `points` en la fila del cliente (no hay tabla de clientes: son filas de `employees` con rol `cliente`); permite auditar y evitar duplicados.
- Puntos por restaurante (config y saldo por restaurante), no globales, porque cada restaurante es independiente.
- Los puntos se acumulan al **entregar** todo el pedido, no al crearlo, para no premiar pedidos cancelados.
- Redondeo hacia abajo por bloques completos de X€.
- Valores por defecto provisionales: X = 10 € e Y = 1 punto.
- No hay endpoint para cancelar pedidos, por lo que no se contemplan reversiones.

Dudas abiertas:

- ¿Qué valores reales de X e Y? ¿Configurables por restaurante o fijos?
- ¿Los puntos son por restaurante o válidos en cualquier restaurante de la plataforma?
- ¿El importe sobre el que se calculan incluye el descuento aplicado con el plan 8 (puntos sobre el total pagado o sobre el total bruto)?
- ¿Hay que mostrar el saldo en web-clientes dentro de esta issue?
- Dependencias: este plan debe hacerse antes que el 8; la acumulación toca `OrderService`, que también modifican los planes 5 (mesas), 9 (packs) y 10 (roles).
