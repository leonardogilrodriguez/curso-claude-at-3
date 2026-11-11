# Plan: Recargar ingredientes y platos al cambiar de restaurante

- **Issue:** #2
- **Tipo:** bug
- **Fecha:** 2026-11-11

## Objetivo

Al estar en la pestaña de ingredientes (o platos) de un restaurante y pulsar la misma pestaña de otro restaurante, la pantalla debe mostrar los datos del restaurante nuevo y no quedarse con los del anterior. Angular reutiliza el mismo componente cuando solo cambia el parámetro `:restaurantId`, así que la carga no puede depender solo de `ngOnInit`.

## Alcance

### Incluido

- Verificar el estado real del código: `IngredientListComponent` y `DishListComponent` ya se suscriben a `route.parent.paramMap`, y `IngredientStore` / `DishStore` ya descartan respuestas de un restaurante que dejó de ser el actual. El fallo original parece corregido en el árbol de trabajo, pero **no hay ningún test que lo proteja** y no está confirmado con la issue.
- Cerrar el mismo hueco en `EmployeeListComponent`, que sigue leyendo `route.parent.snapshot.params` solo en `ngOnInit` y tiene el mismo bug al cambiar de restaurante.
- Tests de regresión (unitarios de stores y componentes, y un e2e de cambio de restaurante).

### Fuera de alcance

- Página en blanco al entrar por URL directa (plan 03).
- Rediseño del menú lateral y de `RestaurantDashboardComponent` (también usa `snapshot`, pero solo depende del restaurante en `ngOnInit` y se trata como mejora aparte).
- Cualquier cambio en la API.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/web-admin/src/app/features/ingredients/store/ingredient.store.spec.ts` | crear | Test: cargar A y luego B deja los datos de B; una respuesta tardía de A no pisa a B. |
| `packages/web-admin/src/app/features/dishes/store/dish.store.spec.ts` | crear | Mismos tests para platos. |
| `packages/web-admin/src/app/features/ingredients/pages/ingredient-list/ingredient-list.component.spec.ts` | crear | Test: al emitir un nuevo `restaurantId` en `paramMap` se vuelve a llamar a `loadByRestaurant`. |
| `packages/web-admin/src/app/features/dishes/pages/dish-list/dish-list.component.spec.ts` | crear | Idem para platos. |
| `packages/web-admin/src/app/features/employees/pages/employee-list/employee-list.component.spec.ts` | crear | Test del mismo comportamiento (rojo antes del arreglo). |
| `packages/web-admin/src/app/features/employees/pages/employee-list/employee-list.component.ts` | modificar | Suscribirse a `paramMap` en lugar de leer `snapshot`. |
| `packages/web-admin/src/app/features/employees/store/employee.store.ts` | modificar | Proteger contra respuestas tardías de otro restaurante (si no lo hace ya). |
| `e2e/restaurant-switch.spec.ts` | crear | E2E: con 2 restaurantes con datos distintos, cambiar de uno a otro en la pestaña muestra los datos correctos. |

## Tareas

Dependen del plan 11 (tarea 1: Vitest configurado en `web-admin`). Los tests se ejecutan con `npm run test -w @resttek/web-admin`. El e2e depende de la tarea 13 del plan 11 (Playwright).

1. [ ] Reproducir el bug en el navegador y anotar el resultado: ingredientes de rest-1 → rest-2, y platos de rest-1 → rest-2; confirmar si ya funciona con el código actual — manual, `packages/web-admin` (~5 min)
2. [ ] Tests de `IngredientStore`: tras `loadByRestaurant('A')` y `loadByRestaurant('B')`, `ingredients()` contiene solo los de B; si la respuesta de A llega después, no se aplica (con `HttpTestingController` o servicio simulado) — `ingredient.store.spec.ts` (~8 min)
3. [ ] Tests de `DishStore` equivalentes; corregir el store si algún test falla — `dish.store.spec.ts` (~8 min)
4. [ ] Tests de `IngredientListComponent`: con un `ActivatedRoute` falso cuyo `parent.paramMap` es un `BehaviorSubject`, emitir `rest-1` y luego `rest-2` provoca dos llamadas a `loadByRestaurant` con cada id — `ingredient-list.component.spec.ts` (~8 min)
5. [ ] Tests de `DishListComponent` equivalentes — `dish-list.component.spec.ts` (~7 min)
6. [ ] Test (rojo) de `EmployeeListComponent`: cambiar el parámetro recarga empleados — `employee-list.component.spec.ts` (~7 min)
7. [ ] Arreglar `EmployeeListComponent` suscribiéndose a `paramMap` con `takeUntilDestroyed`, igual que las otras listas, hasta poner el test en verde — `employee-list.component.ts` (~8 min)
8. [ ] Blindar `EmployeeStore` ante respuestas tardías, con su test unitario previo — `employee.store.ts` (~8 min)
9. [ ] Test e2e: login como admin, abrir ingredientes de rest-1, pulsar ingredientes de rest-2 y comprobar que la tabla muestra «Harina», «Levadura», «Tomate triturado» y no «Albahaca»; repetir con platos («Pizza Napolitana») — `e2e/restaurant-switch.spec.ts` (~10 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm run test -w @resttek/web-admin` pasa, con los specs de stores y listas de ingredientes, platos y empleados.
- [ ] `npm run test:e2e -- restaurant-switch` pasa: tras pulsar Ingredientes (y Platos) de rest-2 estando en los de rest-1, la tabla muestra solo datos de rest-2.
- [ ] Manualmente: en `http://localhost:4200/restaurants/rest-1/ingredients`, pulsar «Ingredientes» de Pizzería Napoli cambia la tabla; lo mismo con Platos y Empleados.
- [ ] `npm run build -w @resttek/web-admin` compila sin errores.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- Se verificó con un navegador automatizado que `/restaurants/rest-2/dishes` y `/restaurants/rest-2/ingredients` cargan datos, y el código de stores/listas ya contiene la corrección. El plan se centra en **proteger con tests** y en cerrar el caso de empleados, no en reescribir lo que ya funciona.
- Se incluye `EmployeeListComponent` aunque la issue solo cite ingredientes y platos, porque es el mismo patrón defectuoso.
- Los tests unitarios de web-admin requieren el plan 11 (Vitest). Si se implementa antes este plan, hay que hacer primero la tarea 1 del plan 11.

Dudas:

- ¿La issue sigue reproduciéndose en vuestra rama o ya estaba corregida? Si ya funciona, ¿se acepta que el trabajo sea solo tests + empleados?
- El seed actual duplica ingredientes y platos (plan 04), lo que puede confundir la comprobación visual; conviene hacer antes el plan 04.
