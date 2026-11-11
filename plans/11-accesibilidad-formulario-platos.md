# Plan: Accesibilizar el formulario de platos (WCAG 2.2 AA)

- **Issue:** #11
- **Tipo:** feature
- **Fecha:** 2026-11-05

## Objetivo

Hacer que el formulario de creación/edición de platos de `web-admin` cumpla WCAG 2.2 nivel AA: que se pueda completar y enviar solo con el teclado, con orden de tabulación lógico, foco visible, etiquetas y errores accesibles. Se añade infraestructura de tests (Vitest para unitarios en Angular, Playwright para e2e) y se valida la accesibilidad con axe. Se graba un vídeo e2e que demuestra el recorrido solo con teclado.

## Alcance

### Incluido

- Rediseño accesible de `dish-form.component` (etiquetas `<label for>`, botones reales, `<form>` con submit, validación con resumen de errores, `aria-invalid`/`aria-describedby`, región `aria-live` para ingredientes, gestión del foco).
- Estilos de foco visible global (`:focus-visible`) y contraste mínimo 4.5:1 en textos del formulario.
- Configuración de Vitest en `web-admin` (builder `@angular/build:unit-test`, ya que Angular 21 lo soporta) y tests unitarios escritos antes del código de cada tarea (TDD).
- Configuración de Playwright (`@playwright/test`) y `@axe-core/playwright`, con un test e2e de axe sobre el formulario.
- Test e2e que graba un vídeo navegando solo con teclado: modifica datos, añade y quita ingredientes, envía el formulario incompleto (errores), lo envía bien y comprueba el plato en la lista. El vídeo se guarda en `e2e-videos/`.
- Actualizar `CLAUDE.md` con los nuevos comandos de test.

### Fuera de alcance

- Accesibilidad de la lista de platos (toggle, editar, borrar sin nombre accesible) y del resto de pantallas de `web-admin`.
- Tests de `web-empleados` y `web-clientes`.
- Cambios en la API (la validación del servidor ya existe).
- Tests unitarios de los e2e (los e2e se verifican ejecutándolos).

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-admin/angular.json` | modificar | Añadir el target `test` con `@angular/build:unit-test` (runner vitest). |
| `packages/web-admin/package.json` | modificar | Script `test` y devDependencies `vitest`, `jsdom`. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.validation.ts` | crear | Función pura de validación de nombre/precio/ingrediente. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.validation.spec.ts` | crear | Tests unitarios de la validación. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar | Estado de errores, envío con validación, foco, mensajes en vivo. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` | modificar | Estructura semántica y atributos ARIA. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` | modificar | Estilos de errores, `sr-only`, fieldset y contraste. |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.spec.ts` | crear | Tests unitarios del componente (TestBed + jsdom). |
| `packages/web-admin/src/styles.css` | modificar | `:focus-visible` global y no suprimir el outline de botones. |
| `package.json` (raíz) | modificar | Sustituir `playwright` por `@playwright/test`, añadir `@axe-core/playwright`, scripts `test:e2e`. |
| `e2e/playwright.config.ts` | crear | Config de Playwright: `webServer` (API + web-admin), vídeo, carpeta de salida. |
| `e2e/support/auth.ts` | crear | Helper de login por teclado/API. |
| `e2e/dish-form.a11y.spec.ts` | crear | Test axe sobre el formulario (vacío, con errores, edición). |
| `e2e/dish-form.keyboard.spec.ts` | crear | Flujo solo teclado con grabación de vídeo. |
| `e2e-videos/dish-form-keyboard.webm` | crear | Vídeo generado por el test. |
| `scripts/record-dish-form-a11y.mjs` y `scripts/videos/` | borrar | Prototipo previo, sustituido por el test e2e. |
| `.gitignore` | modificar | Ignorar `test-results/` y `playwright-report/` (no `e2e-videos/`). |
| `CLAUDE.md` | modificar | Documentar comandos de test unitario de frontend y e2e. |

## Tareas

Cada tarea de implementación empieza por los tests unitarios (rojo) y termina con el código que los pone en verde. Se ejecutan con `npm run test -w @resttek/web-admin`.

1. [x] Configurar Vitest en `web-admin`: target `test` en `angular.json`, script `test`, instalar `vitest` y `jsdom`; añadir un spec trivial del componente que renderice el formulario para comprobar que el runner funciona — `packages/web-admin/angular.json` (~8 min)
2. [x] Tests de validación: nombre vacío/solo espacios → error; precio vacío, 0 o negativo → error; valores válidos → sin errores; ingrediente sin seleccionar, cantidad ≤ 0 o duplicado → error — `dish-form.validation.spec.ts` (~8 min)
3. [x] Implementar `validateDish()` y `validateIngredient()` hasta pasar los tests de la tarea 2 — `dish-form.validation.ts` (~8 min)
4. [ ] Tests de etiquetas: cada campo se localiza con `getByLabel` (nombre, precio, categoría, disponible, descripción, ingrediente, cantidad); el título es un `<h1>`; el enlace de volver tiene nombre accesible — `dish-form.component.spec.ts` (~8 min)
5. [ ] Implementar las etiquetas, `id`s, `<h1>`, `fieldset/legend` de ingredientes y `aria-label` del enlace; indicar campos obligatorios — `dish-form.component.html` (~8 min)
6. [ ] Tests de controles semánticos: Guardar es `button[type=submit]`, Añadir y Quitar son `button[type=button]` con nombre accesible («Quitar Tomate»), Cancelar es un enlace; Enter en el campo cantidad añade el ingrediente sin enviar el formulario; Guardar se deshabilita mientras `loading` — `dish-form.component.spec.ts` (~8 min)
7. [ ] Implementar `<form (ngSubmit)>`, botones reales y `onIngredientEnter()` — `dish-form.component.ts` y `.html` (~8 min)
8. [ ] Tests de errores en envío: enviar vacío no llama a `DishStore.create` y muestra un resumen `role="alert"` con 2 errores; los campos inválidos tienen `aria-invalid="true"` y `aria-describedby` apuntando al mensaje; el foco pasa al resumen; pulsar un enlace del resumen enfoca el campo; al corregir y reenviar se llama a `create` — `dish-form.component.spec.ts` (~10 min)
9. [ ] Implementar señales de errores, `onSubmit()` con validación, foco al resumen y `focusField()` — `dish-form.component.ts` y `.html` (~10 min)
10. [ ] Tests de ingredientes: añadir muestra el chip y vacía el selector; los errores de ingrediente (sin elegir, cantidad ≤ 0, duplicado) se muestran con `aria-describedby`; la región `aria-live` anuncia altas y bajas; tras quitar, el foco va al selector de ingrediente — `dish-form.component.spec.ts` (~10 min)
11. [ ] Implementar `addIngredient()`/`removeIngredient()` con mensajes y gestión del foco — `dish-form.component.ts` y `.html` (~8 min)
12. [ ] Estilos accesibles: `:focus-visible` global, no suprimir el outline de `button`, `sr-only`, estilos de error y de fieldset, placeholders e iconos con contraste ≥ 4.5:1 (sin test unitario: jsdom no calcula contraste ni foco visual; se cubre con axe y vídeo) — `styles.css` y `dish-form.component.css` (~8 min)
13. [ ] Instalar y configurar Playwright (`@playwright/test`, `@axe-core/playwright`), `playwright.config.ts` con `webServer` para API y web-admin, `outputDir` y scripts `test:e2e`; helper de login (sin test unitario) — `e2e/playwright.config.ts` (~10 min)
14. [ ] Test e2e axe: formulario nuevo, con errores visibles y en edición sin violaciones WCAG 2.x A/AA (`wcag2a`, `wcag2aa`, `wcag22aa`) — `e2e/dish-form.a11y.spec.ts` (~8 min)
15. [ ] Test e2e solo teclado con vídeo: login, entrar a Nuevo plato, enviar incompleto y ver errores, modificar datos, añadir/quitar ingredientes, guardar y ver el plato en la lista; copiar el vídeo a `e2e-videos/dish-form-keyboard.webm` — `e2e/dish-form.keyboard.spec.ts` (~10 min)
16. [ ] Limpieza y documentación: borrar `scripts/record-dish-form-a11y.mjs` y `scripts/videos/`, actualizar `.gitignore` y `CLAUDE.md` — `CLAUDE.md` (~5 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm run test -w @resttek/web-admin` ejecuta los tests unitarios con Vitest y todos pasan.
- [ ] `npm test` (API) sigue pasando sin cambios.
- [ ] `npm run build -w @resttek/web-admin` compila sin errores.
- [ ] `npm run test:e2e` pasa, incluido el test de axe sin violaciones WCAG 2.2 AA en el formulario (vacío, con errores y en edición).
- [ ] Existe `e2e-videos/dish-form-keyboard.webm` generado por Playwright. En él, todo el recorrido (tras abrir la app) se hace solo con teclado: modifica datos, añade y quita ingredientes, envía incompleto mostrando errores, crea bien el plato y aparece en la lista.
- [ ] El test e2e no usa `click()` en el flujo del vídeo (se comprueba con `grep -n "click(" e2e/dish-form.keyboard.spec.ts`, sin resultados).
- [ ] Todos los campos tienen etiqueta asociada, los errores se anuncian (`role="alert"`, `aria-invalid`, `aria-describedby`) y el foco es visible en todos los controles.
- [ ] No quedan `div` con `(click)` en `dish-form.component.html` (`grep -n "div.*(click)"` sin resultados).

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- La issue figura como `feature` en `issues.json`, aunque se hablaba de «bug»; se mantiene `feature`.
- Vitest vía `@angular/build:unit-test` (builder oficial de Angular 21) con `jsdom`, en lugar de configurar Vitest a mano.
- La validación se extrae a una función pura para poder testearla de forma aislada.
- Axe se usa solo en e2e (`@axe-core/playwright`), porque en jsdom no puede evaluar contraste ni foco. No se añade `vitest-axe`.
- Los e2e viven en `e2e/` en la raíz (afectan a API + admin), y el vídeo se copia a `e2e-videos/` con nombre fijo para poder versionarlo.
- Ya existe una implementación previa del formulario y un script de grabación (`scripts/record-dish-form-a11y.mjs`) hechos sin TDD. El plan los trata como base: las tareas 4-11 escriben primero los tests y ajustan/rehacen el código existente hasta que pasen, y el script se sustituye por el test e2e.
- Se mantiene la dependencia `playwright` ya instalada solo hasta la tarea 13, donde se sustituye por `@playwright/test`.

Dudas para el equipo:

- ¿Se versiona el vídeo (`e2e-videos/*.webm`, ~6 MB) en el repositorio o se ignora y se genera en CI?
- Los e2e dependen de la BD con `npm run seed` y este no limpia datos previos (issue #4): ¿usamos una BD dedicada para e2e (`DB_PATH`/`NODE_ENV`) o aceptamos duplicados?
- ¿Basta con Chromium para los e2e o se quieren también Firefox/WebKit?
