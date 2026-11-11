# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Resttek: restaurant management platform. Monorepo (npm workspaces, `packages/*`) with an Express API and three Angular apps. Domain terms, UI text and DB status values are in Spanish (pedido, plato, camarero, cocinero, `pendiente`/`preparando`/`listo`/`entregado`); code identifiers are mostly English.

Detailed Spanish docs live in `docs/` (`docs/arquitectura/*.md`, `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md`). Check them for domain and data-model questions instead of duplicating them here.

## Commands

Requires Node 22+. Run from the repo root unless noted.

- `npm install`: installs every workspace. Run once from the root.
- `npm run dev:api`: API on http://localhost:3000 (tsx watch).
- `npm run dev:admin` / `dev:empleados` / `dev:clientes`: Angular apps on 4200 / 4201 / 4202. Each proxies `/api` to :3000 through its `proxy.conf.json`, so start the API first.
- `npm run seed`: creates demo data. Idempotent. Test logins are listed in README.md; the password equals the email (e.g. `admin@resttek.com` / `admin@resttek.com`).
- `npm test`: runs the API test suite (Vitest, 10 files, 66 tests).
- Single API test file: `cd packages/api && npx vitest run src/services/order.service.test.ts`
- Single API test by name: `cd packages/api && npx vitest run -t "nombre del test"`
- API watch mode: `npm run test:watch -w @resttek/api`
- Frontend build: `npm run build -w @resttek/web-admin` (same pattern for `web-empleados` and `web-clientes`).
- `npm run test -w @resttek/web-admin`: unit tests for web-admin (Vitest through Angular's `@angular/build:unit-test` builder, jsdom). `web-empleados` and `web-clientes` still have no frontend test runner.
- `npm run test:e2e`: Playwright e2e tests in `e2e/` (config in `e2e/playwright.config.ts`). It starts the API and web-admin if they are not already running (`ADMIN_URL` overrides the admin URL) and needs seeded data (`npm run seed`). Includes the axe accessibility checks (`dish-form.a11y.spec.ts`) and the keyboard-only recording of the dish form, which saves its video to `e2e-videos/dish-form-keyboard.webm`.
- There is no lint script.

## Architecture

### API (`packages/api`)

- Express 5 + TypeScript, ESM (`"type": "module"`). Imports use `.js` extensions even for `.ts` sources.
- Path aliases (`@employee/*`, `@shared/*`, `@routes/*`, `@services/*`, `@repositories/*`, `@models/*`, `@errors/*`, `@config/*`) are declared in `tsconfig.json`. Both tsx and Vitest resolve them, the latter through `vite-tsconfig-paths`.
- `src/app.ts` mounts every router under `/api/v1`. `src/server.ts` calls `dbConfig.initialize()` before listening.
- Two architectural styles coexist:
  - `src/contexts/employee/` is hexagonal (domain / application / infrastructure). It covers auth, employee registration and employee management. Its manual DI is in `infrastructure/http/dependencies.ts`.
  - Restaurant, dish, ingredient and order are layered by file type: `routes/` → `controllers/` → `services/` → `repositories/`, plus `models/` for interfaces and `normalizeX()` functions. Repository interfaces sit in the same file as their SQLite implementation. Mocks are in `repositories/mocks/`.
- Each routes file wires its own dependencies by hand (repository → service → controller, using `dbConfig`). A new module should follow the same pattern.
- Errors: throw `AppError` subclasses from `src/errors/DomainErrors.ts`. `contexts/shared/infrastructure/http/errorHandler.ts` maps them to HTTP status by `err.name`: names in `NOT_FOUND_ERRORS` → 404, `InvalidCredentialsError` → 401, other `AppError` → 400, anything else → 500. A new not-found error must be added to that list or it will return 400.
- Auth: JWT in `Authorization: Bearer`. `authenticate` sets `req.user`; `authorize([...roles])` checks the role. Roles: `admin`, `manager`, `camarero`, `cocinero`, `cliente`. The JWT secret comes from `JWT_SECRET` and falls back to a hardcoded default in `contexts/shared/infrastructure/http/middlewares.ts`.
- Database: a single SQLite connection in `src/config/database.ts`. The schema is created in `runInitialMigrations()` with `CREATE TABLE IF NOT EXISTS`. There is no migration versioning, so changing an existing table will not alter an existing `packages/api/resttek.db`. With `NODE_ENV=test` the DB is `:memory:`. Foreign keys are on.

### Frontends (`packages/web-*`)

- Angular 21 with standalone components, signals, and zoneless change detection (`provideZonelessChangeDetection`).
- `web-shared` is a library consumed as source (`main: src/index.ts`, path `@resttek/web-shared`). It has no build step. Its exports cover auth (`AuthService`, `AuthStore`, `authGuard`), the HTTP interceptors (`authInterceptor` adds the Bearer token, `errorInterceptor`), the `API_URL` token, the shared login and register components, and base styles. Angular does not always pick up changes in it; restart the dev server if they don't show up.
- Each app's `app.config.ts` provides `API_URL = '/api/v1'` and the shared interceptors. The app routes are guarded by `authGuard`.
- Feature layout differs by app. `web-admin` and `web-empleados` group features as `features/<name>/{models,pages,services,store}`. `web-clientes` keeps models and services in `core/`.
- `web-admin` nests routes under `restaurants/:restaurantId/{dishes,ingredients,employees}`.
