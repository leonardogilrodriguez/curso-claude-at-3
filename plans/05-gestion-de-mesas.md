# Plan: Gestión de mesas

- **Issue:** #5
- **Tipo:** feature
- **Fecha:** 2026-11-11

## Objetivo

Introducir el concepto de mesa en Resttek. El administrador gestiona las mesas de cada restaurante (CRUD) con número, descripción, capacidad y estado (libre, ocupada, reservada). El cliente, al elegir restaurante, indica el número de personas, ve las mesas libres con capacidad suficiente, elige una y, al continuar, la mesa pasa a ocupada y accede a la carta con su pedido ligado a esa mesa. Los empleados ven y cambian el estado de las mesas y consultan el estado de los pedidos de las mesas ocupadas.

## Alcance

### Incluido

- **API:** tabla `tables`, CRUD por restaurante, cambio de estado, listado de mesas disponibles por capacidad, acción «ocupar» atómica y vínculo `orders.table_id` → mesa. Tests con Vitest (TDD).
- **web-admin:** pantalla de mesas (lista + formulario) bajo `restaurants/:restaurantId/tables` y enlace en el menú lateral.
- **web-empleados:** página «Mesas» con estados editables y los pedidos de las mesas ocupadas.
- **web-clientes:** paso previo a la carta (personas → mesas disponibles → continuar) y envío del pedido con `tableId`.
- Datos de demostración en el seed.

### Fuera de alcance

- Sistema de reservas con fecha/hora (el estado `reservada` solo es un estado manual).
- Liberación automática de la mesa al cerrar/pagar el pedido o por tiempo (ver dudas).
- Unión de mesas, planos del salón y notificaciones en tiempo real (se reutiliza el polling actual).
- Migración de los `table_id` de pedidos ya existentes.
- Infraestructura de tests de frontend (se cubre en el plan 11 para web-admin; en el resto se verifica manualmente).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/config/database.ts` | modificar | Crear la tabla `tables` (`CREATE TABLE IF NOT EXISTS`). |
| `packages/api/src/models/table.model.ts` | crear | Interfaz `Table`, estados válidos y `normalizeTableStatus()`. |
| `packages/api/src/errors/DomainErrors.ts` | modificar | Errores `TableNotFoundError`, `InvalidTableStatusError`, `InvalidTableCapacityError`, `TableNumberRequiredError`, `DuplicatedTableNumberError`, `TableNotAvailableError`. |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | modificar | Añadir `TableNotFoundError` a `NOT_FOUND_ERRORS` (si no, devolvería 400). |
| `packages/api/src/repositories/table.repository.ts` | crear | Interfaz + implementación SQLite (incluye ocupar de forma atómica). |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | crear | Mock en memoria para los tests de servicio. |
| `packages/api/src/repositories/table.repository.test.ts` | crear | Tests del repositorio con BD en memoria. |
| `packages/api/src/services/table.service.ts` | crear | Lógica de negocio de mesas. |
| `packages/api/src/services/table.service.test.ts` | crear | Tests del servicio. |
| `packages/api/src/controllers/table.controller.ts` | crear | Handlers HTTP. |
| `packages/api/src/routes/table.routes.ts` | crear | Rutas admin/empleados bajo `/restaurants/:restaurantId/tables`. |
| `packages/api/src/routes/table.public.routes.ts` | crear | Rutas para clientes: mesas disponibles y ocupar. |
| `packages/api/src/app.ts` | modificar | Montar los dos routers nuevos. |
| `packages/api/src/services/order.service.ts` | modificar | Validar que `tableId` pertenece al restaurante y está ocupada. |
| `packages/api/src/services/order.service.test.ts` | modificar | Tests de la validación de mesa en pedidos. |
| `packages/api/src/scripts/seed.ts` | modificar | Crear mesas de ejemplo por restaurante. |
| `docs/dominio/modelo-datos.md` | modificar | Documentar la tabla `tables` y la relación con `orders`. |
| `packages/web-admin/src/app/features/tables/**` | crear | `models`, `services`, `store`, `pages/table-list`, `pages/table-form`, `tables.routes.ts`. |
| `packages/web-admin/src/app/app.routes.ts` | modificar | Ruta `restaurants/:restaurantId/tables`. |
| `packages/web-admin/src/app/core/layout/shell.component.html` | modificar | Enlace «Mesas» en el submenú del restaurante. |
| `packages/web-empleados/src/app/features/tables/**` | crear | Modelo, servicio, store y página de mesas. |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Ruta `mesas`. |
| `packages/web-empleados/src/app/core/layout/shell.component.ts` y `.html` | modificar | Enlace «Mesas» para camarero y gerente. |
| `packages/web-clientes/src/app/core/models/table.model.ts` | crear | Modelo `Table` del cliente. |
| `packages/web-clientes/src/app/core/services/table.service.ts` | crear | Consultar mesas disponibles y ocuparlas. |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | modificar | Guardar `tableId` junto al restaurante; vaciarlo al cambiar de restaurante. |
| `packages/web-clientes/src/app/core/services/order.service.ts` | modificar | Enviar `tableId` real en lugar de `null`. |
| `packages/web-clientes/src/app/features/tables/table-select.component.ts` | crear | Pantalla personas + mesas disponibles + continuar. |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | modificar | El enlace del restaurante lleva al paso de mesa. |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | modificar | Redirigir a la selección de mesa si no hay mesa elegida. |
| `packages/web-clientes/src/app/app.routes.ts` | modificar | Ruta `restaurants/:id/table`. |

## Tareas

Cada tarea de la API empieza por sus tests (TDD, `npm test`). Los frontends no tienen runner de tests: web-admin lo tendrá con el plan 11 (los tests de sus componentes de mesas se añadirán entonces) y en el resto se verifica manualmente con los criterios de aceptación.

### API (con TDD)

1. [x] Crear el modelo `Table`, los estados `libre | ocupada | reservada` y `normalizeTableStatus()`, con sus tests (estado inválido, mayúsculas/espacios) — `packages/api/src/models/table.model.ts` (~8 min)
2. [x] Añadir los errores de dominio de mesas y registrar `TableNotFoundError` en `NOT_FOUND_ERRORS`; test del mapeo a 404 — `packages/api/src/errors/DomainErrors.ts` (~6 min)
3. [x] Crear la tabla `tables` (`id`, `restaurant_id` FK, `number`, `description`, `capacity`, `status`, `created_at`, `updated_at`, `UNIQUE(restaurant_id, number)`) y su test de migración — `packages/api/src/config/database.ts` (~8 min)
4. [x] Tests del repositorio (guardar, buscar por id, listar por restaurante, actualizar, borrar, número duplicado) — `packages/api/src/repositories/table.repository.test.ts` (~10 min)
5. [x] Implementar `SqliteTableRepository` y `MockTableRepository` hasta pasar los tests — `packages/api/src/repositories/table.repository.ts` (~10 min)
6. [x] Tests del servicio para crear/editar: número obligatorio, capacidad ≥ 1 entera, número duplicado, estado inicial `libre` — `packages/api/src/services/table.service.test.ts` (~8 min)
7. [x] Implementar `create`, `update`, `findByRestaurantId`, `findById` y `delete` en `TableService` — `packages/api/src/services/table.service.ts` (~10 min)
8. [x] Tests de cambio de estado (`changeStatus`, transiciones libre/ocupada/reservada, mesa inexistente o de otro restaurante) e implementación — `packages/api/src/services/table.service.test.ts` (~8 min)
9. [x] Tests de `findAvailable(restaurantId, people)`: solo `libre` con `capacity >= people`, ordenadas por capacidad ascendente y número; personas < 1 inválido; e implementación — `packages/api/src/services/table.service.ts` (~8 min)
10. [x] Tests de `occupy(restaurantId, tableId)`: libre → ocupada; si ya no está libre lanza `TableNotAvailableError`; la actualización es condicional (`UPDATE … WHERE status='libre'`) para evitar carreras; e implementación — `packages/api/src/repositories/table.repository.ts` (~10 min)
11. [x] Controlador y rutas admin/empleados: CRUD solo `admin` (y `manager` de su restaurante, si se decide), `GET` y `PATCH /:id/status` para `admin`, `manager`, `camarero`; montarlas en `app.ts`; tests HTTP con supertest si ya está disponible, si no, comprobación con `curl` — `packages/api/src/routes/table.routes.ts` (~10 min)
12. [ ] Rutas para clientes: `GET /public/restaurants/:restaurantId/tables/available?people=N` y `POST …/tables/:id/occupy` (autenticado, rol `cliente`) — `packages/api/src/routes/table.public.routes.ts` (~8 min)
13. [ ] Tests de `OrderService.create` con `tableId`: mesa inexistente, de otro restaurante o no ocupada → error; sin `tableId` se sigue aceptando; e implementación — `packages/api/src/services/order.service.ts` (~10 min)
14. [ ] Añadir mesas al seed (varias capacidades y estados por restaurante) y actualizar `docs/dominio/modelo-datos.md` — `packages/api/src/scripts/seed.ts` (~8 min)

### web-admin

15. [ ] Modelo `Table`, `CreateTableDto` y `TableService` HTTP — `packages/web-admin/src/app/features/tables/services/table.service.ts` (~8 min)
16. [ ] `TableStore` con señales (cargar por restaurante ignorando respuestas obsoletas, crear, actualizar, borrar) — `packages/web-admin/src/app/features/tables/store/table.store.ts` (~8 min)
17. [ ] Página de lista de mesas con estado como etiqueta, editar y borrar — `packages/web-admin/src/app/features/tables/pages/table-list/table-list.component.ts` (~10 min)
18. [ ] Formulario de mesa (número, descripción, capacidad, estado) con validación y etiquetas accesibles — `packages/web-admin/src/app/features/tables/pages/table-form/table-form.component.ts` (~10 min)
19. [ ] Rutas `tables` (con `loadChildren`) y enlace «Mesas» en el menú lateral — `packages/web-admin/src/app/features/tables/tables.routes.ts` (~6 min)

### web-empleados

20. [ ] Modelo, `TableService` y `TableStore` con polling de mesas del restaurante del empleado — `packages/web-empleados/src/app/features/tables/store/table.store.ts` (~10 min)
21. [ ] Página «Mesas»: tarjetas por mesa con su estado y selector/botones para cambiarlo — `packages/web-empleados/src/app/features/tables/pages/mesas/mesas.component.ts` (~10 min)
22. [ ] Mostrar en cada mesa ocupada el estado de sus pedidos (reutiliza `OrderStore`, agrupando por `tableId`) — `packages/web-empleados/src/app/features/tables/pages/mesas/mesas.component.ts` (~10 min)
23. [ ] Ruta `mesas` y enlace en el menú (visible para `camarero` y `manager`) — `packages/web-empleados/src/app/core/layout/shell.component.ts` (~6 min)

### web-clientes

24. [ ] Modelo y `TableService` (disponibles por personas, ocupar) — `packages/web-clientes/src/app/core/services/table.service.ts` (~8 min)
25. [ ] Guardar `tableId` en `CartStore` (se vacía al cambiar de restaurante) y enviarlo en `OrderService.createOrder` — `packages/web-clientes/src/app/core/store/cart.store.ts` (~8 min)
26. [ ] Componente de selección: campo de número de personas, lista de mesas disponibles y botón Continuar deshabilitado hasta elegir una — `packages/web-clientes/src/app/features/tables/table-select.component.ts` (~10 min)
27. [ ] Al continuar: llamar a «ocupar», guardar la mesa y navegar a la carta; si la mesa ya no está libre, mostrar error y recargar la lista — `packages/web-clientes/src/app/features/tables/table-select.component.ts` (~8 min)
28. [ ] Ruta `restaurants/:id/table`, enlazar desde la lista de restaurantes y redirigir desde la carta si no hay mesa — `packages/web-clientes/src/app/app.routes.ts` (~8 min)

### Verificación final

29. [ ] Recorrido manual de extremo a extremo (crear mesa en admin → cliente la ocupa y pide → empleado ve el pedido y la libera), ejecutar `npm test` y compilar las tres apps — (~10 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa, con tests nuevos de modelo, repositorio, servicio y validación de pedidos con mesa.
- [ ] `npm run build -w @resttek/web-admin`, `-w @resttek/web-empleados` y `-w @resttek/web-clientes` compilan sin errores.
- [ ] `POST /api/v1/restaurants/rest-1/tables` con un token `admin` y `{"number":"7","description":"Terraza","capacity":4}` devuelve 201 con estado `libre`; repetir el mismo número devuelve 400.
- [ ] `GET /api/v1/restaurants/nope/tables/x` devuelve 404 (no 400).
- [ ] `GET /api/v1/public/restaurants/rest-1/tables/available?people=5` solo devuelve mesas `libre` con capacidad ≥ 5.
- [ ] Dos peticiones simultáneas `POST …/tables/:id/occupy` sobre la misma mesa: una devuelve 200 y la otra un error de mesa no disponible.
- [ ] `POST /api/v1/orders` con un `tableId` de otro restaurante o de una mesa no ocupada devuelve error; sin `tableId` sigue funcionando.
- [ ] En web-admin (`http://localhost:4200/restaurants/rest-1/tables`) se puede crear, editar y borrar una mesa y el listado refleja los cambios.
- [ ] En web-clientes, al elegir restaurante se pide el número de personas, solo salen mesas libres con capacidad suficiente, «Continuar» está deshabilitado hasta elegir una, y tras continuar la mesa aparece como ocupada y se llega a la carta.
- [ ] El pedido creado por el cliente guarda el `tableId` y en web-empleados aparece como «Mesa N» y dentro de la página de mesas con el estado de sus items.
- [ ] En web-empleados (`http://localhost:4201/mesas`) un camarero puede cambiar una mesa de ocupada a libre y a reservada; un cocinero no ve la página.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- `orders.table_id` ya existe como `TEXT` sin clave foránea. Se mantiene (no se altera la tabla, ya que no hay migraciones) y la integridad se garantiza en `OrderService`. Las mesas nuevas usan UUID como `id`; el «número» es un campo aparte (`number`, texto, único por restaurante).
- «Ocupar» se implementa con un `UPDATE … WHERE status = 'libre'` y se comprueba `changes`, para que dos clientes no cojan la misma mesa a la vez.
- Los gestores de mesas son `admin` (CRUD completo). Cambiar estado: `admin`, `manager` y `camarero`. Lectura: también `cocinero`.
- Las mesas reservadas no aparecen como disponibles para clientes; solo un empleado las pasa a libre/ocupada.
- Las tareas de frontend se verifican manualmente; los tests de componentes de web-admin se añadirán cuando exista el runner del plan 11.

Dudas para el equipo antes de implementar:

- **Liberar mesas:** el issue no dice cuándo vuelve a `libre`. ¿Solo manualmente por un empleado, o automáticamente cuando todos los items del pedido están `entregado`?
- **Reservada:** ¿es solo una marca manual o necesita fecha/hora y a nombre de quién? El plan asume marca manual.
- **Migración de BD:** `CREATE TABLE IF NOT EXISTS` crea `tables` en bases existentes sin problema, pero no hay forma de cambiarla después sin borrar `resttek.db`. ¿Aceptamos esta limitación o se introduce versionado de migraciones?
- **Pedidos sin mesa:** ¿debe el cliente poder seguir pidiendo sin elegir mesa (p. ej. para llevar) o la mesa pasa a ser obligatoria?
- **Mismo cliente, varios pedidos:** si el cliente ya tiene una mesa ocupada, ¿puede añadir más pedidos a la misma mesa (se asume que sí) y qué pasa si abandona la página sin pedir (mesa ocupada «huérfana»)?
- **Permisos de `manager`:** ¿puede el gerente gestionar el CRUD de mesas de su restaurante o solo el `admin`, como en platos e ingredientes?
- **Borrado:** ¿se permite borrar una mesa con pedidos asociados? Se propone impedirlo si está ocupada.
