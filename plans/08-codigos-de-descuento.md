# Plan: Códigos de descuento y canje de puntos

- **Issue:** #8
- **Tipo:** feature
- **Fecha:** 2026-11-11

## Objetivo

Permitir que el administrador de un restaurante cree códigos de descuento (CRUD) y la tabla de equivalencia puntos → euros, y que el cliente pueda aplicar un código y/o canjear sus puntos como descuento al pedir la cuenta.

## Alcance

### Incluido

- API: CRUD de códigos de descuento por restaurante (`code`, tipo porcentaje o importe fijo, valor, fechas de validez, usos máximos, activo).
- API: CRUD de reglas de canje de puntos (`points` → `euros`, p. ej. 10 puntos = 1 €, 100 puntos = 10 €).
- API: cálculo de la cuenta de un pedido (`GET /orders/:id/bill`) con subtotal, descuentos y total, y `POST /orders/:id/bill/discounts` para aplicar un código y/o una regla de puntos (consume los puntos con `PointsService.redeem`).
- web-admin: pantallas de códigos de descuento y de reglas de puntos dentro del restaurante.
- web-clientes: pantalla «Pedir la cuenta» en el detalle del pedido con campo de código, selector de canje de puntos y total final.
- Tests Vitest de API (TDD). Frontends: criterios de aceptación manuales y compilación.

### Fuera de alcance

- Cobro/pasarela de pago: «pedir la cuenta» solo calcula y guarda el total con descuentos.
- Descuentos automáticos o por categoría de plato.
- Pantalla de saldo de puntos independiente en web-clientes.
- Tests de frontend (no hay runner en web-clientes; en web-admin llega con el plan 11).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | Tablas `discount_codes`, `points_redemption_rules` y `order_discounts`. |
| `packages/api/src/models/discount.model.ts` (+ `.test.ts`) | crear | Modelos, validación y `calculateDiscount()`. |
| `packages/api/src/repositories/discount.repository.ts` (+ mock) | crear | Persistencia de códigos, reglas y descuentos aplicados. |
| `packages/api/src/services/discount.service.ts` (+ `.test.ts`) | crear | CRUD y validación de códigos y reglas. |
| `packages/api/src/services/bill.service.ts` (+ `.test.ts`) | crear | Cálculo de la cuenta y aplicación de descuentos. |
| `packages/api/src/controllers/discount.controller.ts` | crear | Handlers CRUD. |
| `packages/api/src/controllers/bill.controller.ts` | crear | Handlers de cuenta. |
| `packages/api/src/routes/discount.routes.ts` (+ test supertest) | crear | `/restaurants/:restaurantId/discount-codes` y `/points-rules`. |
| `packages/api/src/routes/bill.routes.ts` (+ test supertest) | crear | `/orders/:id/bill`. |
| `packages/api/src/errors/DomainErrors.ts` y `errorHandler.ts` | modificar | Errores de código inválido/caducado/agotado y `DiscountCodeNotFoundError` (añadir a `NOT_FOUND_ERRORS`). |
| `packages/api/src/app.ts` | modificar | Montar rutas. |
| `packages/api/src/scripts/seed.ts` | modificar | Códigos y reglas demo. |
| `packages/web-admin/src/app/features/discounts/**` | crear | Modelos, servicio, store y páginas de listado/formulario (patrón `features/<name>/{models,pages,services,store}`). |
| `packages/web-admin/src/app/app.routes.ts` y menú lateral | modificar | Rutas `restaurants/:restaurantId/discounts` y enlace. |
| `packages/web-clientes/src/app/core/{models,services}/bill.*` | crear | Modelo y servicio de cuenta. |
| `packages/web-clientes/src/app/features/orders/order-detail.component.ts` | modificar | Sección «Pedir la cuenta» con código y puntos. |
| `docs/dominio/modelo-datos.md` | modificar | Documentar tablas. |
| `packages/api/openapi.yaml` | modificar | Documentar endpoints (si el plan 6 ya está hecho). |

## Tareas

Cada tarea de API empieza por los tests (Vitest) y termina con el código que los pone en verde.

1. [ ] Tests de `calculateDiscount(subtotal, code)`: porcentaje (10 % de 50 € → 5 €), importe fijo, descuento nunca superior al subtotal, valores inválidos (porcentaje > 100, importe ≤ 0). Implementarlo con los modelos — `packages/api/src/models/discount.model.ts` (~10 min)
2. [ ] Crear tablas `discount_codes` (código único por restaurante), `points_redemption_rules` y `order_discounts`, con test de esquema en `:memory:` — `packages/api/src/config/database.ts` (~8 min)
3. [ ] Tests del repositorio de códigos (crear, buscar por código y restaurante, actualizar, borrar, incrementar usos) e implementar con mock — `packages/api/src/repositories/discount.repository.ts` (~10 min)
4. [ ] Tests del servicio CRUD de códigos (código duplicado en el mismo restaurante → error, normalización a mayúsculas, validez) e implementarlo — `packages/api/src/services/discount.service.ts` (~10 min)
5. [ ] Tests del CRUD de reglas puntos→euros (puntos > 0, euros > 0, no duplicar mismos puntos) e implementarlo en el servicio — `packages/api/src/services/discount.service.ts` (~8 min)
6. [ ] Tests supertest de `/restaurants/:restaurantId/discount-codes` y `/points-rules` (solo admin/manager; 404 de código inexistente; 400 de datos inválidos) e implementar controlador y rutas — `packages/api/src/routes/discount.routes.ts` (~10 min)
7. [ ] Tests de `BillService.getBill(orderId)`: subtotal = Σ precio × cantidad de items, sin descuentos total = subtotal; e implementarlo — `packages/api/src/services/bill.service.ts` (~8 min)
8. [ ] Tests de aplicar código en la cuenta: código válido resta; caducado/inactivo/agotado → error; de otro restaurante → error; no se aplica dos veces el mismo código; incrementa usos. Implementarlo — `packages/api/src/services/bill.service.ts` (~10 min)
9. [ ] Tests de canjear puntos: elige una regla, descuenta saldo con `PointsService.redeem`, falla con puntos insuficientes y no deja el total por debajo de 0; implementarlo — `packages/api/src/services/bill.service.ts` (~10 min)
10. [ ] Tests supertest de `GET /orders/:id/bill` y `POST /orders/:id/bill/discounts` (solo el cliente dueño del pedido; 401/403) e implementarlos, montar rutas en `app.ts` y seed — `packages/api/src/routes/bill.routes.ts` (~10 min)
11. [ ] web-admin: modelos, servicio y store de códigos y reglas — `packages/web-admin/src/app/features/discounts/` (~10 min)
12. [ ] web-admin: página de listado y formulario de códigos de descuento (accesible, siguiendo el patrón del formulario del plan 11) y ruta/menú — `packages/web-admin/src/app/features/discounts/pages/` (~10 min)
13. [ ] web-admin: página de reglas de puntos → euros — `packages/web-admin/src/app/features/discounts/pages/` (~8 min)
14. [ ] web-clientes: modelo y servicio de cuenta (`getBill`, `applyDiscounts`) — `packages/web-clientes/src/app/core/services/bill.service.ts` (~8 min)
15. [ ] web-clientes: sección «Pedir la cuenta» en el detalle del pedido (código, selector de puntos, total final, errores) — `packages/web-clientes/src/app/features/orders/order-detail.component.ts` (~10 min)
16. [ ] Documentar tablas en `modelo-datos.md` y endpoints en `openapi.yaml` — `docs/dominio/modelo-datos.md` (~5 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa con los tests nuevos y los existentes.
- [ ] `npm run build -w @resttek/web-admin` y `npm run build -w @resttek/web-clientes` compilan sin errores.
- [ ] Como admin, `POST /api/v1/restaurants/rest-1/discount-codes` con `{ "code": "VERANO10", "type": "percentage", "value": 10 }` devuelve 201; repetir el mismo código devuelve 400.
- [ ] Como cliente con un pedido de 50 € entregado, `POST /api/v1/orders/:id/bill/discounts` con `VERANO10` hace que `GET /orders/:id/bill` devuelva total 45 €.
- [ ] Con una regla de 10 puntos = 1 € y saldo suficiente, canjear 100 puntos resta 10 € de la cuenta y reduce el saldo en 100; con saldo insuficiente devuelve 400.
- [ ] Un camarero no puede crear códigos (403) y un cliente no puede ver la cuenta de un pedido ajeno.
- [ ] Manual: en web-admin se crean, editan y borran códigos y reglas; en web-clientes se aplica un código y puntos en «Pedir la cuenta» y el total se actualiza.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Hoy no existe flujo de «pedir la cuenta» (el detalle del pedido solo muestra el ticket); se crea como vista de cuenta en `order-detail` con endpoints de cuenta.
- Códigos únicos por restaurante, con tipos porcentaje e importe fijo, fechas opcionales y usos máximos opcionales.
- El descuento total nunca supera el subtotal (total mínimo 0).
- Se guardan los descuentos aplicados en `order_discounts` para auditoría; el total no se persiste en `orders`.
- Reutilizo `PointsService.redeem` del plan 7; este plan **depende del plan 7**.

Dudas abiertas:

- ¿Se pueden combinar un código y puntos en la misma cuenta? ¿Se pueden aplicar varios códigos? (el plan asume 1 código + puntos).
- ¿El descuento afecta a los puntos que se ganan (plan 7), calculándolos sobre el total pagado?
- ¿Un código es de un solo uso por cliente o reutilizable hasta agotar usos?
- ¿Los puntos se descuentan al aplicarlos o al confirmar el pago (no hay confirmación de pago hoy)?
- Si el plan 5 (mesas) cambia el cierre del pedido, ¿«pedir la cuenta» debe pasar a ser por mesa en vez de por pedido?
