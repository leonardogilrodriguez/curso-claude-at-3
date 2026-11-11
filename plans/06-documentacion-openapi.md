# Plan: Documentación OpenAPI 3 de la API

- **Issue:** #6
- **Tipo:** feature
- **Fecha:** 2026-11-11

## Objetivo

Generar un documento OpenAPI 3 que describa todos los endpoints de la API (`/api/v1`), para poder publicarlo. El documento se mantiene como archivo versionado y se valida con tests para que no quede desactualizado respecto a las rutas reales.

## Alcance

### Incluido

- Documento `openapi.yaml` (OpenAPI 3.0.3) con: auth, empleados, restaurantes (privados y públicos), ingredientes, platos (privados y públicos), pedidos y `/health`.
- Esquemas reutilizables (`Dish`, `Order`, `OrderItem`, `Restaurant`, `Ingredient`, `Employee`, `Error`), seguridad `bearerAuth` (JWT) y roles requeridos por endpoint en la descripción.
- Endpoint `GET /api/v1/openapi.json` y UI en `/api/docs` servidos por la API.
- Tests Vitest que validan el documento y que cada ruta registrada en Express está documentada.
- Script `npm run docs:openapi` que valida el documento.

### Fuera de alcance

- Generar el documento automáticamente a partir de decoradores o del código (se mantiene a mano).
- Documentar endpoints de otros planes (mesas, puntos, descuentos, packs): cada plan añade su parte a `openapi.yaml`.
- Publicar el documento en un hosting externo.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/openapi.yaml` | crear | Documento OpenAPI 3 con todos los endpoints y esquemas. |
| `packages/api/src/config/openapi.ts` | crear | Carga y parseo del YAML; exporta el objeto del documento. |
| `packages/api/src/config/openapi.test.ts` | crear | Valida estructura del documento y cobertura de rutas. |
| `packages/api/src/routes/docs.routes.ts` | crear | Sirve `/openapi.json` y la UI de documentación. |
| `packages/api/src/routes/docs.routes.test.ts` | crear | Tests supertest de los endpoints de documentación. |
| `packages/api/src/app.ts` | modificar | Montar `docs.routes` (`/api/docs`, `/api/v1/openapi.json`). |
| `packages/api/package.json` | modificar | Dependencias (`yaml`, `swagger-ui-express`, `@apidevtools/swagger-parser`) y script `docs:openapi`. |
| `README.md` | modificar | Cómo ver y publicar la documentación. |
| `CLAUDE.md` | modificar | Recordar que todo endpoint nuevo se documenta en `openapi.yaml`. |

## Tareas

Cada tarea empieza por los tests (Vitest, `cd packages/api && npx vitest run <archivo>`) y después el código que los pone en verde.

1. [ ] Instalar dependencias (`yaml`, `swagger-ui-express`, `@types/swagger-ui-express`, `@apidevtools/swagger-parser`) y crear `openapi.yaml` mínimo (`openapi`, `info`, `servers`, `/health`) — `packages/api/openapi.yaml` (~8 min)
2. [ ] Test: el documento carga y valida contra la especificación OpenAPI 3 (`swagger-parser.validate`), tiene `bearerAuth` y `servers` con `/api/v1`; implementar `loadOpenApiDocument()` — `packages/api/src/config/openapi.ts` (~8 min)
3. [ ] Test + docs de auth: `POST /auth/login` y `POST /auth/register` (cuerpos, respuestas 200/400/401) y esquema `Error` — `packages/api/openapi.yaml` (~10 min)
4. [ ] Test + docs de restaurantes (privados `/restaurants` y públicos `/public/restaurants`) con esquema `Restaurant` — `packages/api/openapi.yaml` (~10 min)
5. [ ] Test + docs de ingredientes y empleados (`/restaurants/{restaurantId}/ingredients`, `/employees`, `/restaurants/{restaurantId}/employees`) con roles permitidos — `packages/api/openapi.yaml` (~10 min)
6. [ ] Test + docs de platos (privados y públicos) con esquema `Dish` y categorías válidas — `packages/api/openapi.yaml` (~8 min)
7. [ ] Test + docs de pedidos (`POST /orders`, `/orders/active`, `/orders/mine`, `/orders/{id}`, `PATCH /orders/{orderId}/items/{itemId}/status`) con esquemas `Order`/`OrderItem` y estados — `packages/api/openapi.yaml` (~10 min)
8. [ ] Test de cobertura: recorrer las rutas montadas en `app` (stack de Express) y comprobar que cada método+ruta existe en el documento; ajustar el documento hasta que pase — `packages/api/src/config/openapi.test.ts` (~10 min)
9. [ ] Test supertest: `GET /api/v1/openapi.json` devuelve 200 con `openapi: 3.x`; `GET /api/docs/` devuelve HTML; implementar `docs.routes.ts` y montarlo en `app.ts` — `packages/api/src/routes/docs.routes.ts` (~8 min)
10. [ ] Script `docs:openapi` (valida el documento y falla si hay errores), y documentar en `README.md` y `CLAUDE.md` — `packages/api/package.json` (~5 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa, incluidos los tests nuevos de OpenAPI.
- [ ] `npm run docs:openapi -w @resttek/api` termina sin errores de validación.
- [ ] `curl -s localhost:3000/api/v1/openapi.json | jq .openapi` devuelve `"3.0.3"`.
- [ ] `http://localhost:3000/api/docs` muestra la UI con todos los grupos de endpoints.
- [ ] El test de cobertura falla si se añade una ruta a Express sin documentarla.
- [ ] Todos los endpoints indican autenticación (`bearerAuth`) y roles permitidos, o `security: []` si son públicos.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Documento escrito a mano en YAML (no generado desde el código): el código no usa esquemas (zod, etc.) de los que derivarlo.
- Se sirve la UI con `swagger-ui-express`; si se prefiere solo el archivo estático, se omite la tarea de la UI.
- Este plan documenta solo los endpoints existentes hoy; los planes 5, 7, 8, 9 y 10 añaden sus endpoints al mismo archivo.
- Dependencia: conviene ejecutarlo después de los planes de API que cambien rutas (10) o, si va antes, que esos planes actualicen `openapi.yaml` (el test de cobertura lo exigirá).

Dudas abiertas:

- ¿Dónde se publica (GitHub Pages, Redoc, Swagger UI hospedado)? Condiciona si basta con el YAML.
- ¿La UI `/api/docs` debe estar disponible en producción o solo en desarrollo?
- Los controladores devuelven errores con formas distintas (`{ error }` en pedidos, `errorHandler` en el resto): ¿se documentan tal cual o se unifica antes?
