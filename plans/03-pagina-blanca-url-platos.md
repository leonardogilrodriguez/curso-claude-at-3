# Plan: Página en blanco al entrar por URL directa a platos

- **Issue:** #3
- **Tipo:** bug
- **Fecha:** 2026-11-11

## Objetivo

Al abrir directamente `http://localhost:4200/restaurants/rest-2/dishes` (o rutas similares, como `/ingredients`, `/employees`, `/dishes/new` o `/dishes/<id>/edit`) la aplicación debe mostrar la página correspondiente y nunca una pantalla en blanco. Si la ruta o el restaurante no existen, debe verse un mensaje claro.

## Alcance

### Incluido

- Reproducir el fallo en distintas rutas de `restaurants/:restaurantId/*` con carga directa (recarga de página y sesión iniciada), y también sin sesión.
- Identificar y corregir la causa real: arranque (`ShellComponent` carga restaurantes en `ngOnInit`), resolución del parámetro en `route.parent` de las rutas hijas con `loadChildren`, `authGuard`, o errores no capturados.
- Mostrar un estado de error o «no encontrado» si el restaurante del URL no existe.
- Tests de regresión (unitarios y e2e con carga directa de URL).

### Fuera de alcance

- Cambio de datos al cambiar de restaurante (plan 02).
- Accesibilidad del formulario de platos (plan 11).
- Cambios en la API.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-admin/src/app/app.routes.ts` | modificar (si procede) | Estructura de rutas/parámetros si la causa está ahí. |
| `packages/web-admin/src/app/core/layout/shell.component.ts` | modificar (si procede) | Sincronización del menú con la URL en la carga directa. |
| `packages/web-admin/src/app/features/dishes/pages/dish-list/dish-list.component.ts` | modificar (si procede) | Lectura del `restaurantId` y estados de error. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar (si procede) | Idem para `/dishes/new` y `/dishes/:id/edit`. |
| `packages/web-admin/src/app/core/layout/not-found.component.ts` | modificar (si procede) | Reutilizar para restaurante inexistente. |
| `packages/web-admin/src/app/features/dishes/pages/dish-list/dish-list.component.spec.ts` | crear | Test: con `restaurantId` en la ruta se carga y se muestra la lista; sin él, mensaje de error. |
| `e2e/direct-urls.spec.ts` | crear | E2E: abrir cada URL directa y comprobar que hay contenido visible. |

## Tareas

Dependen del plan 11 (tarea 1, Vitest en `web-admin`; tarea 13, Playwright). Cada tarea de código empieza por el test.

1. [ ] Reproducir: con API y admin arrancados, iniciar sesión y abrir por URL directa `/restaurants/rest-2/dishes`, `/ingredients`, `/employees`, `/dishes/new`; anotar rutas en blanco y errores de consola — manual (~8 min)
2. [ ] Reproducir también sin sesión y con restaurante inexistente (`/restaurants/nope/dishes`) y registrar el comportamiento esperado de cada caso — manual (~5 min)
3. [ ] Test e2e (rojo si el bug existe) que abre cada URL directa tras hacer login y exige un encabezado visible («Platos», «Ingredientes», «Empleados», «Nuevo plato») — `e2e/direct-urls.spec.ts` (~10 min)
4. [ ] Test unitario del componente afectado reproduciendo la causa hallada (p. ej. `route.parent` sin `restaurantId` en carga directa, o error sin capturar) — `dish-list.component.spec.ts` (~8 min)
5. [ ] Corregir la causa raíz hasta poner en verde los tests 3 y 4 — archivo según el diagnóstico (`app.routes.ts`, `shell.component.ts` o la lista) (~10 min)
6. [ ] Test + implementación: restaurante inexistente o fallo de la API muestra un mensaje de error visible en lugar de una página vacía — `dish-list.component.spec.ts` y `dish-list.component.html` (~8 min)
7. [ ] Repetir el arreglo y los tests para ingredientes y empleados si comparten la causa — `ingredient-list.component.ts`, `employee-list.component.ts` (~10 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] Con sesión iniciada, abrir (pegando la URL) `http://localhost:4200/restaurants/rest-2/dishes` muestra el título «Platos» y la tabla o el estado vacío; lo mismo con `/ingredients`, `/employees`, `/dishes/new` y `/dishes/<id>/edit`.
- [ ] `/restaurants/nope/dishes` muestra un mensaje de error o «no encontrado», no una página en blanco.
- [ ] Sin sesión, cualquiera de esas URLs redirige al login.
- [ ] No hay errores en la consola del navegador en esas cargas.
- [ ] `npm run test -w @resttek/web-admin` y `npm run test:e2e -- direct-urls` pasan.
- [ ] `npm run build -w @resttek/web-admin` compila sin errores.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Se comprobó con un navegador automatizado, con sesión iniciada y el árbol de trabajo actual, que `/restaurants/rest-2/dishes` y `/restaurants/rest-2/ingredients` **sí renderizan** la tabla. Por tanto el plan empieza por reproducir y diagnosticar, y la causa raíz queda sin fijar hasta la tarea 1; los archivos marcados «si procede» se confirmarán entonces.
- Es probable que el bug dependa de un escenario no probado (recarga con `localStorage` caducado, token expirado, `dishes/new`, ruta de edición o un restaurante cuyo id no está en la lista). Las tareas 1-2 cubren esos casos.
- Los tests de web-admin requieren el plan 11 (Vitest y Playwright).

Dudas:

- ¿En qué circunstancias exactas se vio la página en blanco (navegador, sesión nueva o recargada, rama)? Sin ese dato puede que la issue ya esté corregida y baste con añadir los tests de regresión.
