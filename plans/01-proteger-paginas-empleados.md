# Plan: Proteger páginas de empleados por rol

- **Issue:** #1
- **Tipo:** bug
- **Fecha:** 2026-11-11

## Objetivo

Hoy cualquier usuario autenticado de `web-empleados` puede entrar escribiendo la URL de `/barra`, `/salon` o `/cocina`: el rol solo se usa en el shell para ocultar enlaces del menú. Hay que controlar el acceso a nivel de ruta: el camarero solo entra en barra y salón, el cocinero solo en cocina y el gerente (`manager`) en todo.

## Alcance

### Incluido

- Un guard de rol (`roleGuard`) reutilizable en `web-shared`, que lee el rol de `AuthStore.userRole()`.
- Aplicarlo en las rutas `cocina`, `barra` y `salon` de `web-empleados` con los roles permitidos de cada una.
- Redirección de la ruta raíz `''` y de los accesos denegados a la página por defecto del rol (cocinero → `/cocina`, camarero → `/barra`, manager → `/cocina`); sin sesión → `/login`.
- Roles sin acceso a ninguna página (`admin`, `cliente`) → `/login` (cerrando la sesión no es necesario; ver dudas).

### Fuera de alcance

- Autorización en la API (la issue #10 cubre los items; la API de pedidos activos no se toca aquí).
- Proteger rutas de `web-admin` y `web-clientes`.
- Cambios visuales en el menú lateral (ya filtra por rol).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-shared/src/lib/auth/role.guard.ts` | crear | Guard de rol parametrizable por `data.roles` de la ruta. |
| `packages/web-shared/src/index.ts` | modificar | Exportar `roleGuard`. |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Añadir `canActivate: [roleGuard]` y `data: { roles }` a cocina, barra y salón; redirect inicial según rol. |
| `packages/web-empleados/src/app/core/layout/shell.component.ts` | modificar | Reutilizar la misma tabla de roles/ruta por defecto para no duplicarla. |

## Tareas

No hay runner de tests de frontend (ver Decisiones), por lo que cada tarea se verifica manualmente con el comando o la comprobación indicada. Requisitos: `npm run seed`, `npm run dev:api` y `npm run dev:empleados`.

1. [ ] Crear `roleGuard` (`CanActivateFn`): si no hay sesión devuelve `UrlTree('/login')`; si `route.data['roles']` incluye el rol devuelve `true`; si no, `UrlTree` a la ruta por defecto del rol — `packages/web-shared/src/lib/auth/role.guard.ts` (~10 min)
2. [ ] Definir en el mismo archivo la función `defaultRouteForRole(role)` (cocinero → `/cocina`, camarero → `/barra`, manager → `/cocina`, otros → `/login`) y exportar ambos desde `index.ts` — `packages/web-shared/src/index.ts` (~5 min)
3. [ ] Aplicar `canActivate: [roleGuard]` y `data: { roles: [...] }` a `cocina` (`cocinero`, `manager`), `barra` y `salon` (`camarero`, `manager`) — `packages/web-empleados/src/app/app.routes.ts` (~7 min)
4. [ ] Sustituir `redirectTo: 'cocina'` de la ruta vacía por un guard/redirect que use `defaultRouteForRole`, para que un camarero que entra en `/` aterrice en `/barra` y no en una ruta prohibida — `packages/web-empleados/src/app/app.routes.ts` (~8 min)
5. [ ] Hacer que `defaultRoute` del shell use `defaultRouteForRole` (elimina la duplicación) — `packages/web-empleados/src/app/core/layout/shell.component.ts` (~5 min)
6. [ ] Verificación manual por rol con `cocinero1@resttek.com`, `camarero1@resttek.com` y `gerente1@resttek.com`: escribir cada URL en el navegador y comprobar redirección o acceso; y compilar con `npm run build -w @resttek/web-empleados` (~10 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] Logueado como `camarero1@resttek.com`: `http://localhost:4201/barra` y `/salon` cargan; `http://localhost:4201/cocina` redirige a `/barra`.
- [ ] Logueado como `cocinero1@resttek.com`: `/cocina` carga; `/barra` y `/salon` redirigen a `/cocina`.
- [ ] Logueado como `gerente1@resttek.com`: las tres rutas cargan.
- [ ] Sin sesión (localStorage limpio), abrir cualquiera de las tres URLs redirige a `/login`.
- [ ] Abrir `http://localhost:4201/` con cada rol lleva a su página por defecto sin pasar por una ruta prohibida (sin bucles de redirección).
- [ ] `npm run build -w @resttek/web-empleados` compila sin errores.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- El guard va en `web-shared` (como `authGuard`) para poder reutilizarlo en otras apps; los roles permitidos se pasan con `data.roles` en la ruta.
- No se hace TDD: `web-empleados` y `web-shared` no tienen runner de tests ni specs (ver `CLAUDE.md`), y montarlo queda fuera del alcance de este bug. Se compensa con la verificación manual por rol de la tarea 6.
- Al denegar acceso se redirige a la página por defecto del rol en vez de mostrar un 403, para que el usuario no vea una pantalla vacía.

Dudas para revisar:

- ¿Qué hacer con roles `admin` y `cliente` que lleguen a `web-empleados`? Se propone redirigir a `/login` sin cerrar sesión; podría ser mejor cerrar sesión o mostrar un mensaje.
- La protección en el cliente no sustituye a la de la API: ¿se abre otra issue para proteger `GET /orders/active` por rol y restaurante?
