# Plan: El seed debe resetear la base de datos

- **Issue:** #4
- **Tipo:** bug
- **Fecha:** 2026-11-11

## Objetivo

Al ejecutar `npm run seed` la base de datos debe quedar exactamente con los datos de demo, aunque antes se hubieran añadido o modificado registros. Para ello el script debe vaciar todas las tablas y volver a rellenarlas. La issue habla de `api/src/scripts/seed.py`, pero el script real es `packages/api/src/scripts/seed.ts`.

## Alcance

### Incluido

- Función de reseteo que borra todas las tablas respetando las claves foráneas (`order_items`, `orders`, `dish_ingredients`, `dishes`, `ingredients`, `employees`, `restaurants`).
- Refactorizar el seed en una función `runSeed(db)` reutilizable y testeable, con `seed.ts` como punto de entrada.
- Corregir el origen de duplicados actual: los ingredientes, platos y pedidos usan `randomUUID()` con `INSERT OR IGNORE`, así que cada ejecución añade filas nuevas (observado: ingredientes de rest-1 repetidos 3 veces).
- Salvaguarda para no ejecutarlo en producción y actualizar `CLAUDE.md` y `README.md` (hoy dicen que el seed es idempotente/no destructivo).
- Tests con Vitest sobre SQLite en memoria.

### Fuera de alcance

- Migraciones de esquema o versionado de la base de datos.
- Nuevas tablas o datos de demo (mesas, puntos, descuentos, packs de otras issues).
- Cambios en `database.ts` más allá de lo necesario para el reseteo.

## Archivos afectados

| Archivo | Acción | Motivo |
| --- | --- | --- |
| `packages/api/src/scripts/reset-database.ts` | crear | Función `resetDatabase(db)` que vacía las tablas en orden seguro. |
| `packages/api/src/scripts/reset-database.test.ts` | crear | Tests del reseteo. |
| `packages/api/src/scripts/seed-data.ts` | crear | `runSeed(db)` con el contenido actual del seed, llamando antes a `resetDatabase`. |
| `packages/api/src/scripts/seed-data.test.ts` | crear | Tests: sembrar dos veces deja los mismos datos; datos añadidos o modificados desaparecen. |
| `packages/api/src/scripts/seed.ts` | modificar | Solo inicializa la BD, llama a `runSeed` y cierra la conexión. |
| `CLAUDE.md` | modificar | Cambiar «Idempotent» por «destructivo: borra todos los datos». |
| `README.md` | modificar | Avisar de que el seed borra los datos existentes. |

## Tareas

Se ejecutan con `cd packages/api && npx vitest run src/scripts`.

1. [ ] Tests de `resetDatabase`: con filas en las 7 tablas (incluida una relación `dish_ingredients` y `order_items`) y claves foráneas activas, tras llamar a la función todas las tablas están vacías y no lanza error — `reset-database.test.ts` (~10 min)
2. [ ] Implementar `resetDatabase(db)` con `DELETE FROM` en orden hijo → padre hasta pasar los tests — `reset-database.ts` (~8 min)
3. [ ] Tests de `runSeed`: sobre BD en memoria, tras ejecutarlo existen 2 restaurantes, 9 empleados + admin, 8 ingredientes, 7 platos y 1 pedido con sus líneas — `seed-data.test.ts` (~10 min)
4. [ ] Test (rojo): insertar un restaurante extra, modificar el nombre de `rest-1` y el email de un empleado, ejecutar `runSeed` y comprobar que el extra desaparece y los valores vuelven a los de demo — `seed-data.test.ts` (~8 min)
5. [ ] Test: ejecutar `runSeed` dos veces seguidas deja los mismos recuentos (sin duplicados) — `seed-data.test.ts` (~5 min)
6. [ ] Mover la lógica de `seed.ts` a `runSeed(db)`, llamar primero a `resetDatabase`, y volver determinista el resultado hasta pasar los tests 3-5 — `seed-data.ts` (~10 min)
7. [ ] Test de salvaguarda: `runSeed` rechaza ejecutarse con `NODE_ENV=production`; implementar la comprobación — `seed-data.test.ts`, `seed-data.ts` (~7 min)
8. [ ] Dejar `seed.ts` como entrada mínima (initialize, `runSeed`, close, manejo de errores) y comprobar `npm run seed` dos veces contra el archivo real — `seed.ts` (~5 min)
9. [ ] Actualizar la documentación del seed — `CLAUDE.md`, `README.md` (~5 min)

## Criterios de aceptación

El trabajo se da por hecho cuando se cumplen todos estos puntos:

- [ ] `npm test` pasa, incluidos los nuevos tests de `reset-database` y `seed-data`.
- [ ] Tras añadir un restaurante o modificar un ingrediente por la API y ejecutar `npm run seed`, ese cambio ha desaparecido: `GET /api/v1/restaurants` devuelve solo `rest-1` y `rest-2` y los valores originales.
- [ ] Ejecutar `npm run seed` dos veces seguidas deja el mismo número de filas (por ejemplo, 5 ingredientes en rest-1, no 10 ni 15).
- [ ] Los usuarios de prueba del README siguen pudiendo iniciar sesión.
- [ ] `NODE_ENV=production npm run seed` termina con error y no borra nada.
- [ ] `CLAUDE.md` y `README.md` ya no describen el seed como idempotente/no destructivo.

## Decisiones y dudas

Decisiones tomadas por mi cuenta:

- El script es `seed.ts` (no `seed.py`); se actualiza el nombre en las notas de la issue al implementar.
- «Eliminar los datos de las tablas» incluye también `employees` (y por tanto el admin), que se vuelven a crear en el seed.
- Se extrae `runSeed(db)` a otro archivo porque `seed.ts` ejecuta `seed()` al importarse y no se puede testear sin lanzar el script.
- Se bloquea la ejecución en `NODE_ENV=production` por ser una operación destructiva; no estaba pedido.
- Las tablas se vacían con `DELETE` (no `DROP`), así que el esquema creado por `runInitialMigrations()` no cambia.

Dudas:

- ¿Se prefiere pedir confirmación (flag `--yes` o pregunta interactiva) antes de borrar, además del bloqueo en producción?
- Al añadir tablas nuevas en otras issues (mesas, puntos, descuentos, packs) habrá que añadirlas al reseteo: ¿conviene derivar la lista de tablas de `sqlite_master` para no olvidarlo?
