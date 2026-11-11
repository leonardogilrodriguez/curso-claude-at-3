# Plan: Cada rol solo modifica el estado de sus items

- **Issue:** #10
- **Tipo:** bug
- **Fecha:** 2026-11-11

## Objetivo

El endpoint `PATCH /api/v1/orders/:orderId/items/:itemId/status` solo exige estar autenticado (`authenticate`), así que un cocinero puede cambiar el estado de una bebida y un camarero el de un plato. Hay que restringirlo: el item pertenece a barra (camarero) si su plato es de categoría `bebida`, y a cocina (cocinero) en cualquier otro caso. El `manager` puede cambiar cualquiera, y el resto de roles ninguno.

## Alcance

### Incluido

- Regla de dominio «quién puede modificar qué item» según el rol y la categoría del plato (`dishCategory`).
- Comprobación en `OrderService.updateItemStatus` recibiendo el rol del usuario autenticado, con un nuevo error de dominio.
- Respuesta HTTP 403 cuando el rol no corresponde, y 403 si el rol no es de empleado (`authorize` en la ruta).
- Tests unitarios Vitest de la regla, del servicio y actualización de los existentes.

### Fuera de alcance

- Comprobar que el pedido pertenece al restaurante del empleado (se anota en dudas).
- Cambios en `web-empleados` (las pantallas ya filtran por categoría; la API es lo que se endurece).
- Reglas de transición de estados (por ejemplo, no saltar de `pendiente` a `entregado`).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/models/order.model.ts` | modificar | Función `canRoleUpdateItem(role, dishCategory)` junto a la normalización de estados. |
| `packages/api/src/models/order.model.test.ts` | crear | Tests de la regla de permisos. |
| `packages/api/src/errors/DomainErrors.ts` | modificar | Nuevo `ItemStatusForbiddenError`. |
| `packages/api/src/services/order.service.ts` | modificar | `updateItemStatus` recibe el rol y lanza el error si no procede. |
| `packages/api/src/services/order.service.test.ts` | modificar | Tests nuevos y adaptar los existentes a la nueva firma. |
| `packages/api/src/controllers/order.controller.ts` | modificar | Pasar `req.user.role` al servicio y devolver 403 para el nuevo error. |
| `packages/api/src/routes/order.routes.ts` | modificar | Añadir `authorize(['camarero', 'cocinero', 'manager'])` al PATCH. |

## Tareas

Cada tarea empieza por los tests (rojo) y termina con el código que los pone en verde. Se ejecutan con `cd packages/api && npx vitest run <archivo>`.

1. [ ] Tests de `canRoleUpdateItem`: `cocinero` puede con `principal`/`entrante`/`postre` y no con `bebida`; `camarero` puede con `bebida` y no con otras; `manager` puede con todas; `cliente`, `admin` y rol desconocido no pueden con ninguna; categoría `undefined` se trata como no-bebida (cocina); `Bebida` en mayúsculas cuenta como bebida — `packages/api/src/models/order.model.test.ts` (~8 min)
2. [ ] Implementar `canRoleUpdateItem` hasta poner en verde los tests de la tarea 1 — `packages/api/src/models/order.model.ts` (~7 min)
3. [ ] Tests del servicio: cocinero sobre una bebida lanza `ItemStatusForbiddenError` y el estado no cambia; camarero sobre un plato lanza el error; camarero sobre bebida y cocinero sobre plato actualizan; manager actualiza ambos. Adaptar los 4 tests existentes a la nueva firma `updateItemStatus(orderId, itemId, status, role)` — `packages/api/src/services/order.service.test.ts` (~10 min)
4. [ ] Añadir `ItemStatusForbiddenError` y modificar `OrderService.updateItemStatus` para comprobar el permiso (después de encontrar el item y antes de normalizar/guardar el estado) — `packages/api/src/errors/DomainErrors.ts` y `order.service.ts` (~8 min)
5. [ ] Test de orden de validaciones: con pedido inexistente se sigue lanzando `OrderNotFoundError` (404/400 actual) aunque el rol no corresponda; con estado inválido y rol correcto se sigue lanzando `InvalidOrderStatusError` — `packages/api/src/services/order.service.test.ts` (~5 min)
6. [ ] Controlador y ruta: leer `req.user.role`, devolver 403 con `{ error }` si el error es `ItemStatusForbiddenError`, y proteger el PATCH con `authorize(['camarero', 'cocinero', 'manager'])` (la capa HTTP no tiene tests; se verifica con `curl`, ver criterios) — `order.controller.ts` y `order.routes.ts` (~8 min)
7. [ ] Ejecutar la suite completa (`npm test`) y comprobar a mano con `curl` los cuatro casos de los criterios con datos del seed (~8 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa entero (los tests nuevos incluidos).
- [ ] Con el token de `cocinero1@resttek.com`, `PATCH /api/v1/orders/:orderId/items/:itemId/status` con body `{"status":"listo"}` sobre un item cuyo plato es `bebida` devuelve 403 y el estado en BD no cambia.
- [ ] Con el token de `camarero1@resttek.com`, el mismo PATCH sobre un item de plato no bebida devuelve 403.
- [ ] Con `camarero1` sobre una bebida y con `cocinero1` sobre un plato, el PATCH devuelve 204 y el estado se actualiza.
- [ ] Con `gerente1@resttek.com` el PATCH devuelve 204 sobre cualquier item; con `cliente1@resttek.com` devuelve 403.
- [ ] Sin token sigue devolviendo 401.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- La categoría `bebida` es de barra (camarero) y todo lo demás de cocina (cocinero), igual que filtran hoy `barra.component.ts` y `cocina.component.ts`.
- El `manager` puede modificar cualquier item (ve todas las pantallas de empleados en la issue #1).
- El rol se toma siempre del JWT (`req.user.role`), nunca del body.
- La regla vive en `models/order.model.ts` como función pura y el servicio la aplica, siguiendo la arquitectura por capas de pedidos. El error nuevo se mapea a 403 en el controlador (que gestiona sus errores), no hace falta tocar `errorHandler.ts`.
- La ruta solo admite roles `camarero`, `cocinero` y `manager`; `cliente` y `admin` reciben 403.

Dudas para revisar antes de implementar:

- ¿Debe poder el `admin` cambiar el estado de items? Se ha excluido por no tener pantalla de empleados.
- ¿Hay que verificar también que el pedido es del mismo restaurante que el empleado (`user.restaurantId`)? Hoy cualquier empleado puede tocar pedidos de otro restaurante; se propone abrir otra issue.
