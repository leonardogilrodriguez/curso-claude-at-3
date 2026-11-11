# Plan: Packs de productos

- **Issue:** #9
- **Tipo:** feature
- **Fecha:** 2026-11-11

## Objetivo

Permitir a los administradores crear packs con precio cerrado compuestos por «ranuras» de categoría (p. ej. entrante + principal + bebida por 20 €), con la posibilidad de limitar qué platos se pueden elegir en cada ranura. El cliente que selecciona un pack elige un plato por ranura y lo pide como una unidad.

## Alcance

### Incluido

- API: CRUD de packs por restaurante y endpoint público para consultarlos desde la carta.
- Modelo de pack: nombre, descripción, precio, disponible, y ranuras (categoría, etiqueta y lista opcional de platos permitidos; si está vacía, valen todos los platos disponibles de la categoría; opción de excluir platos).
- Pedidos: aceptar líneas de tipo pack con las selecciones por ranura, validar elecciones, y registrar los items resultantes con el precio prorrateado del pack para que la cuenta sea correcta.
- web-admin: listado y formulario de packs.
- web-clientes: sección Packs en la carta, selector de plato por ranura y carrito con packs.
- Tests Vitest de API (TDD). Frontends: criterios manuales y compilación.

### Fuera de alcance

- Packs con más de un plato por ranura, cantidades por ranura o precios suplementarios por plato premium.
- Packs con horarios o vigencia.
- Estadísticas de ventas por pack.
- Tests de frontend (web-clientes sin runner; web-admin depende del plan 11).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | Tablas `packs`, `pack_slots`, `pack_slot_dishes`; columnas nuevas de pedido (ver decisiones). |
| `packages/api/src/models/pack.model.ts` (+ `.test.ts`) | crear | Modelos, validación y `validatePackSelection()`. |
| `packages/api/src/repositories/pack.repository.ts` (+ mock) | crear | Persistencia de packs con ranuras (transaccional como `dish.repository`). |
| `packages/api/src/services/pack.service.ts` (+ `.test.ts`) | crear | CRUD y reglas de validación. |
| `packages/api/src/controllers/pack.controller.ts` | crear | Handlers HTTP. |
| `packages/api/src/routes/pack.routes.ts` y `pack.public.routes.ts` (+ tests) | crear | Rutas privadas (admin/manager) y públicas de lectura. |
| `packages/api/src/models/order.model.ts` | modificar | `OrderItem` con `packId`/`packInstanceId` y precio efectivo. |
| `packages/api/src/services/order.service.ts` (+ test) | modificar | Aceptar líneas pack y validar selecciones. |
| `packages/api/src/repositories/order.repository.ts` | modificar | Guardar y leer items de pack. |
| `packages/api/src/errors/DomainErrors.ts` y `errorHandler.ts` | modificar | `PackNotFoundError` (añadir a `NOT_FOUND_ERRORS`) e `InvalidPackSelectionError`. |
| `packages/api/src/app.ts` | modificar | Montar rutas. |
| `packages/api/src/scripts/seed.ts` | modificar | Pack demo. |
| `packages/web-admin/src/app/features/packs/**` | crear | Modelos, servicio, store, listado y formulario. |
| `packages/web-admin/src/app/app.routes.ts` y menú | modificar | Rutas `restaurants/:restaurantId/packs`. |
| `packages/web-clientes/src/app/core/{models,services,store}/` | modificar/crear | Modelo de pack, servicio y soporte de packs en `CartStore`. |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | modificar | Mostrar packs y diálogo de selección. |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | modificar | Mostrar/enviar packs. |
| `docs/dominio/modelo-datos.md` | modificar | Documentar tablas nuevas. |
| `packages/api/openapi.yaml` | modificar | Documentar endpoints (si el plan 6 ya está hecho). |

## Tareas

Cada tarea de API empieza por los tests (Vitest) y termina con el código que los pone en verde.

1. [ ] Tests de validación de pack (precio > 0, al menos 1 ranura, categoría válida por `normalizeDishCategory`, nombre obligatorio) e implementar `pack.model.ts` — `packages/api/src/models/pack.model.ts` (~8 min)
2. [ ] Tests de `validatePackSelection(pack, selections, dishes)`: una elección por ranura, el plato pertenece a la categoría, está en la lista permitida (o no está excluido), está disponible y es del mismo restaurante; implementarlo — `packages/api/src/models/pack.model.ts` (~10 min)
3. [ ] Crear tablas `packs`, `pack_slots`, `pack_slot_dishes` (con `ON DELETE CASCADE`) y test de esquema en `:memory:` — `packages/api/src/config/database.ts` (~8 min)
4. [ ] Tests del repositorio (guardar pack con ranuras, `findById`, `findByRestaurant`, actualizar reemplazando ranuras, borrar) e implementar con mock — `packages/api/src/repositories/pack.repository.ts` (~10 min)
5. [ ] Tests del `PackService` (crear/actualizar/borrar, `PackNotFoundError`, platos permitidos que pertenezcan al restaurante y a la categoría de la ranura) e implementarlo — `packages/api/src/services/pack.service.ts` (~10 min)
6. [ ] Tests supertest del CRUD (`/restaurants/:restaurantId/packs`, solo admin/manager, 404 inexistente) y de la lectura pública (`/public/restaurants/:restaurantId/packs` solo disponibles); controlador y rutas — `packages/api/src/routes/pack.routes.ts` (~10 min)
7. [ ] Tests de `OrderService.create` con líneas de pack: genera un item por ranura con el mismo `packInstanceId`, rechaza selecciones inválidas y pack no disponible; implementar — `packages/api/src/services/order.service.ts` (~10 min)
8. [ ] Tests del precio efectivo: el precio del pack se prorratea entre sus items (suma = precio del pack) y la cuenta del pedido da el precio del pack; implementar en modelo/servicio — `packages/api/src/models/order.model.ts` (~10 min)
9. [ ] Tests del repositorio de pedidos con items de pack (guardar y leer `packId`, `packInstanceId`, precio efectivo) y ajustar `order.repository.ts` — `packages/api/src/repositories/order.repository.ts` (~10 min)
10. [ ] Montar rutas en `app.ts`, seed con un pack demo y documentar en `modelo-datos.md` — `packages/api/src/app.ts` (~6 min)
11. [ ] web-admin: modelos, servicio y store de packs — `packages/web-admin/src/app/features/packs/` (~8 min)
12. [ ] web-admin: listado de packs con borrado y disponibilidad — `packages/web-admin/src/app/features/packs/pages/` (~8 min)
13. [ ] web-admin: formulario de pack (datos, ranuras, platos permitidos por ranura), accesible según el patrón del plan 11 — `packages/web-admin/src/app/features/packs/pages/` (~10 min)
14. [ ] web-clientes: modelo y servicio de packs, y soporte de packs en `CartStore` (línea con selecciones, total) — `packages/web-clientes/src/app/core/` (~10 min)
15. [ ] web-clientes: sección de packs en la carta con selector de un plato por ranura — `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` (~10 min)
16. [ ] web-clientes: carrito y envío del pedido con packs, y detalle de pedido agrupando los items del pack — `packages/web-clientes/src/app/features/cart/cart.component.ts` (~10 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa con los tests nuevos y los existentes.
- [ ] `npm run build -w @resttek/web-admin` y `npm run build -w @resttek/web-clientes` compilan sin errores.
- [ ] Como admin, `POST /api/v1/restaurants/rest-1/packs` con un pack de 20 € (entrante + principal + bebida) devuelve 201 y `GET /api/v1/public/restaurants/rest-1/packs` lo lista.
- [ ] `POST /api/v1/orders` con el pack y un plato por ranura devuelve 201 con 3 items que comparten `packInstanceId` y suman 20 €.
- [ ] Elegir un plato excluido del pack (p. ej. la cerveza) o de otra categoría devuelve 400.
- [ ] Manual: en web-admin se crea un pack excluyendo un plato de la ranura de bebidas; en web-clientes ese plato no aparece al elegir bebida, y el pedido llega a cocina y barra con cada item en su rol.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Un pack se compone de ranuras por categoría; cada ranura admite una elección y una lista opcional de platos permitidos o excluidos.
- Un pack pedido se descompone en items normales (uno por ranura) con `packInstanceId` común, para que cocina y barra los vean con el flujo y estados existentes y sin tocar `web-empleados`.
- El precio del pack se prorratea entre los items proporcionalmente al precio de sus platos, de modo que cuenta y puntos/descuentos (planes 7 y 8) sigan sumando el precio del pack.
- Al ser tablas nuevas, `CREATE TABLE IF NOT EXISTS` basta; las columnas nuevas en `order_items` no se aplican a un `resttek.db` existente (hay que añadir `ALTER TABLE` en la migración inicial o recrear la BD).
- **Este plan afecta a pedidos**: toca `OrderService` y `order.repository`, que también modifican los planes 5, 7 y 10 (coordinar el orden de implementación).

Dudas abiertas:

- ¿Cómo se prorratea el precio del pack: proporcional al precio de los platos o repartido a partes iguales? Condiciona el reparto de ingresos por rol.
- ¿Se admite suplemento por platos más caros que el «precio base» del pack?
- ¿Excluir un plato es una lista de bloqueados o solo una lista de permitidos? (el plan soporta ambas).
- ¿Un pack cuenta para stock de ingredientes (hoy no se descuenta stock al pedir)?
- ¿Con el plan 5 (mesas) hay que ajustar algo en cómo se envía el pedido?
- ¿Se numera el pack en la carta junto a las categorías existentes o en una pestaña propia?
