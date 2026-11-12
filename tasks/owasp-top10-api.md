# Auditoría OWASP Top 10 (2021) de `packages/api`

Alcance: código de `packages/api/src` (Express 5, TypeScript, SQLite), revisión estática de solo lectura, más `npm audit --omit=dev`. No se ha ejecutado la API ni modificado código. Las rutas de archivo son relativas a `packages/api/`.

## Resumen ejecutivo

| Severidad | Hallazgos |
|-----------|-----------|
| Crítica   | 1 |
| Alta      | 3 |
| Media     | 7 |
| Baja      | 7 |
| **Total** | **18** |

Los problemas más graves, por orden de prioridad:

1. **H-04 (crítica)**: el secreto JWT tiene un valor por defecto hardcodeado en el repositorio. Si `JWT_SECRET` no se define, cualquiera puede forjar un token `admin`.
2. **H-01 (alta)**: no hay aislamiento por restaurante. Un `manager` de un restaurante puede leer y modificar platos de cualquier otro, porque `restaurantId` del token nunca se compara con `:restaurantId` de la URL.
3. **H-02 (alta)**: los endpoints de pedidos solo exigen estar autenticado. Cualquier cliente (el registro es público) puede listar los pedidos activos de cualquier restaurante y cambiar el estado de cualquier ítem.
4. **H-13 (alta)**: dependencias de producción con vulnerabilidades conocidas (`proxy-addr` crítica, `body-parser` alta, `qs`, `sqlite3`/`tar`/`node-gyp`).

Lo que está bien: todo el SQL usa consultas parametrizadas (sin inyección SQL), las contraseñas se almacenan con bcrypt (coste 10), los DTO de empleado no devuelven `passwordHash`, y `.gitignore` excluye `*.db`.

---

## A01:2021 Broken Access Control

### H-01 (alta): sin aislamiento entre restaurantes (IDOR / multi-tenant)

- Archivos: `src/routes/dish.routes.ts:14-18`, `src/routes/ingredient.routes.ts:14-18`, `src/services/dish.service.ts:48-78`, `src/contexts/employee/infrastructure/http/restaurant-employee.routes.ts:7`, `src/routes/restaurant.routes.ts:16`, `src/contexts/shared/infrastructure/http/middlewares.ts:34-40`.
- Descripción: `authorize([...])` solo comprueba el rol. El JWT incluye `restaurantId` (`LoginUseCase.ts:40-44`), pero ningún middleware ni servicio lo compara con `req.params.restaurantId`. Además, `PUT/DELETE /restaurants/:restaurantId/dishes/:id` buscan el plato solo por `id` (`dish.service.ts:49,73`) y no verifican que pertenezca al `restaurantId` de la ruta. Lo mismo ocurre con ingredientes. `GET /restaurants/:id` deja a cualquier usuario autenticado, incluido un `cliente`, leer cualquier restaurante (dirección, email, teléfono y propietario).
- Escenario: un `manager` del restaurante A hace `DELETE /api/v1/restaurants/A/dishes/<id-de-un-plato-de-B>` (o `PUT` con precios alterados) y modifica la carta del competidor. Con `GET /api/v1/restaurants/B/dishes` o `/ingredients` lee su carta y su inventario.
- Recomendación: añadir un middleware `authorizeRestaurant` que, salvo para `admin`, exija `req.user.restaurantId === req.params.restaurantId`. En los servicios, cargar el recurso con `WHERE id = ? AND restaurant_id = ?` y devolver 404 si no coincide. Restringir `GET /restaurants/:id` al restaurante del usuario o a `admin`.

### H-02 (alta): pedidos sin autorización por rol ni propiedad

- Archivos: `src/routes/order.routes.ts:14-18`, `src/controllers/order.controller.ts:28-41` y `70-85`, `src/services/order.service.ts:69-84`.
- Descripción: las cinco rutas de pedidos usan solo `authenticate`. `GET /orders/active?restaurantId=` devuelve los pedidos activos de cualquier restaurante, con `clientId`, `tableId` y notas. `PATCH /orders/:orderId/items/:itemId/status` cambia el estado de cualquier ítem sin comprobar rol (debería ser `camarero`/`cocinero`/`manager`/`admin`) ni restaurante.
- Escenario: un atacante se registra con `POST /auth/register` (rol `cliente`, sin verificación de email), recorre los pedidos activos de cualquier restaurante y marca ítems como `entregado` (o `pendiente`), lo que sabotea la cocina. También extrae `clientId` de otros usuarios.
- Recomendación: `authorize(['admin','manager','camarero','cocinero'])` en `/active` y `/status`, más comprobación de que `restaurantId` del token coincide con el del pedido (H-01). Validar transiciones de estado permitidas por rol (por ejemplo, el cocinero solo `preparando` y `listo`).

### H-03 (media): lectura de cualquier pedido por ID

- Archivos: `src/routes/order.routes.ts:17`, `src/controllers/order.controller.ts:57-68`.
- Descripción: `GET /orders/:id` devuelve el pedido a cualquier usuario autenticado, sin comprobar que sea el cliente que lo creó ni personal de ese restaurante. Los UUID no son adivinables, pero aparecen en las respuestas de `/orders/active` (H-02), lo que anula esa protección.
- Escenario: encadenado con H-02, un cliente lee el detalle completo (platos, notas, restaurante) de pedidos ajenos.
- Recomendación: permitir solo si `order.clientId === req.user.id` o si el usuario es personal del restaurante del pedido; si no, devolver 404.

---

## A02:2021 Cryptographic Failures

### H-04 (crítica): secreto JWT por defecto hardcodeado

- Archivos: `src/contexts/shared/infrastructure/http/middlewares.ts:4` y `src/contexts/employee/infrastructure/BcryptAuthService.ts:5`.
- Descripción: `process.env.JWT_SECRET || 'super-secret-resttek-key'`. El valor está duplicado en dos archivos y es público en el repositorio. No existe `.env` ni validación de arranque que obligue a configurar la variable (`src/server.ts` no la comprueba). Cualquier despliegue sin `JWT_SECRET` arranca con un secreto conocido.
- Escenario: un atacante firma localmente `jwt.sign({id:'x', role:'admin', restaurantId:null}, 'super-secret-resttek-key')` y envía `Authorization: Bearer <token>`. `authenticate` lo acepta y obtiene acceso de administrador total (crear empleados `admin`, borrar platos, etc.).
- Recomendación: eliminar el valor por defecto y fallar al arrancar (`throw` en `server.ts` o al cargar el módulo) si `JWT_SECRET` no está definido o tiene menos de 32 bytes aleatorios. Centralizar la lectura del secreto en un único módulo. Rotar el secreto en cualquier entorno que haya usado el valor por defecto.

Otros puntos criptográficos revisados: bcrypt con 10 rondas es aceptable (subir a 12 es recomendable). No hay TLS en la app, lo que se asume delegado a un proxy inverso. Conviene documentarlo.

---

## A03:2021 Injection

SQL: **sin hallazgos**. Todas las consultas de `repositories/*` y `SqliteEmployeeRepository.ts` usan marcadores `?`. Las partes dinámicas (`WHERE role = ?`, `LIMIT ? OFFSET ?`) también están parametrizadas. No hay `eval`, `exec` ni plantillas del lado servidor.

### H-05 (baja): `logoUrl` sin validar esquema ni longitud

- Archivos: `src/controllers/restaurant.controller.ts:17` y `72`, `src/services/restaurant.service.ts:93-135`.
- Descripción: `logoUrl` se guarda tal cual. Un `admin` (o un token forjado, H-04) puede guardar `javascript:...` o una URL arbitraria. El frontend lo usa en `restaurant-list.component.html:37`. No he verificado si se enlaza en `src` o `href`, por lo que el XSS es potencial.
- Escenario: un valor malicioso en `logoUrl` se sirve a todos los clientes por el endpoint público `GET /public/restaurants`.
- Recomendación: validar que sea `https://` con `new URL()`, limitar la longitud y, si es posible, restringir a una lista de dominios permitidos.

---

## A04:2021 Insecure Design

### H-06 (media): cantidad de ítems sin límite en pedidos (DoS)

- Archivos: `src/services/order.service.ts:27-37`, `src/controllers/order.controller.ts:9-17`.
- Descripción: por cada ítem se hace `for (i < item.quantity)` y se crea un registro por unidad, sin validar tipo ni máximo. Tampoco hay límite en el número de `items`.
- Escenario: `POST /orders` con `{"items":[{"dishId":"…","quantity":100000000}]}` genera un bucle enorme con inserciones SQLite una a una (`order.repository.ts:50-55`). Bloquea el event loop y llena la base de datos con un único usuario autenticado.
- Recomendación: validar con un esquema (zod o similar): `quantity` entero entre 1 y, por ejemplo, 20; `items` con un máximo de 50 elementos; `notes` con longitud máxima.

### H-07 (media): el pedido no valida platos, restaurante ni mesa

- Archivos: `src/services/order.service.ts:21-51`, `src/repositories/order.repository.ts:44-56`.
- Descripción: solo se comprueba que `restaurantId` no esté vacío. No se valida que el restaurante exista (solo lo frena la clave foránea), que cada `dishId` pertenezca a ese restaurante y esté `available`, ni que `items` sea un array no vacío (si falta, un `TypeError` acaba en 400, ver H-12). `tableId` es texto libre.
- Escenario: un cliente pide un plato de otro restaurante, o un plato marcado como no disponible. Mezcla platos de varios restaurantes en un mismo pedido, lo que rompe la lógica de negocio y los datos de cocina.
- Recomendación: en el servicio, cargar los platos por ID, exigir `restaurant_id` coincidente y `available = 1`, y rechazar pedidos vacíos.

### H-08 (baja): paginación sin límites en el listado de empleados

- Archivo: `src/contexts/employee/infrastructure/http/EmployeeController.ts:38-39`.
- Descripción: `parseInt(...) || 10`. Con `limit=-1`, SQLite interpreta `LIMIT -1` como sin límite, y un `limit` enorme también se acepta.
- Escenario: un admin (o un token forjado) vuelca toda la tabla de empleados en una sola petición.
- Recomendación: acotar `limit` a un rango (1 a 100) y `offset >= 0`.

### H-09 (baja): tipos numéricos sin validar

- Archivos: `src/services/dish.service.ts:103`, `src/services/ingredient.service.ts:87`.
- Descripción: `props.price <= 0` y `props.currentStock < 0` son falsos para cadenas, `null`, `NaN` u objetos, así que pasan. Con JSON `price:"abc"` SQLite guarda texto (tipado dinámico) y los totales o precios quedan corruptos.
- Recomendación: validar `typeof === 'number' && Number.isFinite(...)` y un máximo razonable.

---

## A05:2021 Security Misconfiguration

### H-10 (media): CORS abierto a cualquier origen

- Archivo: `src/app.ts:14` (`app.use(cors())`).
- Descripción: sin lista de orígenes, `Access-Control-Allow-Origin: *`. Al usar Bearer y no cookies, el riesgo CSRF es bajo, pero cualquier web puede llamar a la API desde el navegador de la víctima. Es más relevante si algún día se mueve el token a cookie.
- Recomendación: `cors({ origin: process.env.ALLOWED_ORIGINS.split(',') })` con los orígenes reales de las tres apps.

### H-11 (baja): sin cabeceras de seguridad ni endurecimiento básico

- Archivo: `src/app.ts:13-16`.
- Descripción: no se usa `helmet` ni `app.disable('x-powered-by')`, así que Express anuncia su tecnología. `express.json()` usa el límite por defecto (100 kb), lo cual es aceptable.
- Recomendación: añadir `helmet()` y desactivar `x-powered-by`.

### H-12 (baja): fuga de mensajes de error internos

- Archivo: `src/controllers/order.controller.ts:19-25`.
- Descripción: `createOrder` devuelve `error.message` de cualquier excepción con 400. Eso incluye errores de SQLite (por ejemplo `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`) y `TypeError` (`items is not iterable`), que revelan el esquema y la implementación. Además, cualquier otro error devuelve 500 sin pasar por `errorHandler`.
- Recomendación: delegar con `next(error)` a `errorHandler`, que ya oculta los errores no controlados (`errorHandler.ts:31`), y mapear solo `AppError`.

---

## A06:2021 Vulnerable and Outdated Components

### H-13 (alta): dependencias con vulnerabilidades conocidas

- Archivo: `package.json` (dependencias) y `package-lock.json`. Resultado de `npm audit --omit=dev`: 12 vulnerabilidades (2 críticas, 7 altas, 1 moderada, 2 bajas).
- Detalle:
  - `proxy-addr` 1.1.0–2.0.7 (**crítica**, transitiva de Express).
  - `body-parser` 2.0.0–2.3.0 (**alta**, transitiva de Express; procesa todos los cuerpos JSON) y `qs` (moderada, DoS).
  - `sqlite3` 5.x (alta, directa), que arrastra `tar` <=7.5.20 (**crítica**), `node-gyp`, `cacache`, `make-fetch-happen`, `brace-expansion`, `ip-address`. Estas afectan sobre todo a la instalación y compilación (extracción de tar), no a las peticiones en ejecución.
- Escenario: las de `body-parser`, `qs` y `proxy-addr` están en la ruta de cada petición HTTP (DoS y fallos de parseo). Las de `tar` y `node-gyp` suponen riesgo en la cadena de suministro al instalar.
- Recomendación: `npm audit fix` resuelve `proxy-addr`, `qs` y `body-parser`. Actualizar `sqlite3` a 6.x (cambio mayor, `npm audit fix --force`) y probar con la suite. Añadir `npm audit --omit=dev` al CI.

Nota: `.github/workflows` incluye revisión con Claude, pero no he comprobado que haya un paso de auditoría de dependencias.

---

## A07:2021 Identification and Authentication Failures

Ver también H-04, que es la causa raíz más grave de este grupo.

### H-14 (media): sin límite de intentos en login ni registro

- Archivos: `src/contexts/employee/infrastructure/http/auth.routes.ts:6-7`, `src/app.ts`.
- Descripción: no hay `express-rate-limit`, bloqueo de cuenta ni retardo progresivo. `/auth/login` ejecuta bcrypt en cada intento. `/auth/register` es público y sin verificación de email.
- Escenario: fuerza bruta o *credential stuffing* contra `admin@resttek.com`, o creación masiva de cuentas `cliente` (habilita el abuso de H-02 y H-06).
- Recomendación: limitar por IP y por email (por ejemplo, 5 intentos por 15 min en login, 10 registros por hora). Añadir verificación de email o captcha en el registro.

### H-15 (media): sin política de contraseñas y credenciales demo triviales

- Archivos: `src/contexts/employee/application/RegisterClientUseCase.ts:38`, `src/contexts/employee/application/CreateEmployeeUseCase.ts:28`, `src/scripts/seed.ts:22` y `51`.
- Descripción: no se valida longitud ni complejidad (se admite `"1"`; si `password` falta, `bcrypt.hash(undefined)` lanza un error y acaba en 500). Los datos semilla usan como contraseña el propio email (`admin@resttek.com` / `admin@resttek.com`), documentado en README.
- Escenario: si el seed se ejecuta en un entorno expuesto, hay un administrador con credenciales públicas. Los usuarios pueden elegir contraseñas débiles.
- Recomendación: exigir mínimo 12 caracteres (y máximo 72 bytes, límite de bcrypt), comprobar contra una lista de contraseñas comunes, y hacer que el seed solo funcione con `NODE_ENV !== 'production'` o genere contraseñas aleatorias.

### H-16 (baja): gestión de tokens mejorable

- Archivos: `src/contexts/shared/infrastructure/http/middlewares.ts:23`, `BcryptAuthService.ts:18`.
- Descripción: `jwt.verify` no fija `algorithms` (con secreto de cadena solo admite HS*, pero conviene explicitarlo). No hay `iss`/`aud`. Los tokens duran 8 h y llevan el rol; no hay revocación ni refresh token. Si un admin cambia el rol de un empleado o lo elimina, el token antiguo sigue siendo válido hasta 8 h. No hay endpoint de cambio de contraseña ni de logout.
- Recomendación: `jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ... })`, reducir la vida a 15-60 min con refresh token revocable, o verificar el rol contra la base de datos en cada petición sensible.

### H-17 (baja): enumeración de usuarios

- Archivos: `src/contexts/employee/application/LoginUseCase.ts:29-38`, `RegisterClientUseCase.ts:33-36`.
- Descripción: el mensaje de login es uniforme (`InvalidCredentialsError`), pero si el email no existe se responde sin ejecutar bcrypt, así que el tiempo de respuesta delata si la cuenta existe. `POST /auth/register` con un email existente devuelve `DuplicatedEmailError`.
- Recomendación: ejecutar siempre `bcrypt.compare` contra un hash ficticio cuando el usuario no existe. Aceptar la enumeración en el registro o responder de forma genérica con confirmación por email.

---

## A08:2021 Software and Data Integrity Failures

**Sin hallazgos** de código: no hay deserialización insegura, ni carga dinámica de código, ni actualizaciones automáticas. Observaciones:

- El servidor confía por completo en los claims del JWT (`role`, `restaurantId`); su integridad depende del secreto (H-04).
- `package-lock.json` existe en el monorraíz. No se ha verificado la integridad de CI/CD más allá de la presencia de workflows de GitHub Actions. Conviene fijar versiones de las acciones por SHA.

---

## A09:2021 Security Logging and Monitoring Failures

### H-18 (media): sin registro de eventos de seguridad

- Archivos: `src/contexts/shared/infrastructure/http/errorHandler.ts:31`, `src/server.ts`, `src/contexts/shared/infrastructure/http/middlewares.ts`.
- Descripción: el único log de la aplicación es `console.log` en el arranque. Los errores 500 se devuelven al cliente sin registrarse (`errorHandler` no llama a `console.error` ni a un logger). Login fallido, tokens inválidos, 403, creación de empleados y cambios de estado no dejan rastro, ni hay *request id* ni alertas.
- Escenario: un ataque de fuerza bruta (H-14) o el uso de un token forjado (H-04) no se detecta ni se puede investigar después.
- Recomendación: añadir un logger estructurado (pino) con un middleware de petición. Registrar login fallido/correcto, 401/403, operaciones administrativas (empleados, restaurantes) y excepciones no controladas con su *stack*, sin volcar contraseñas ni tokens.

---

## A10:2021 Server-Side Request Forgery (SSRF)

**Sin hallazgos**: la API no realiza peticiones HTTP salientes (no hay `fetch`, `axios` ni `http.request` en `src/`). `logoUrl` se almacena pero el servidor no lo descarga. Si en el futuro se añade descarga o validación remota del logo, deberá bloquear IPs privadas y esquemas no HTTP(S). Ver H-05 para la validación de la URL.
