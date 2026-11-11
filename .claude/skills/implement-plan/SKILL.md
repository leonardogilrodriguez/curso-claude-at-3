---
name: implement-plan
description: Implementa un plan de plans/ tarea a tarea con TDD estricto. Crea una rama con el nombre del plan a partir de development (o de main si development no existe), marca cada tarea como hecha y commitea con el comando /commit. Úsalo cuando el usuario pida implementar un plan.
argument-hint: <ruta-del-plan>
---

# implement-plan

Implementa el plan indicado, tarea a tarea, en una rama propia y con TDD estricto.

Argumentos recibidos: $ARGUMENTS

## Pasos

1. **Localiza el plan.** El argumento es la ruta del plan (por ejemplo `plans/1-login-registro-jwt.md`). Si solo recibes un nombre, busca `plans/<nombre>.md`. Si no existe, para y dilo. El nombre de la rama es el nombre del fichero sin `.md` (por ejemplo `1-login-registro-jwt`).

2. **Comprueba el estado del repositorio.**
   - Confirma que estamos en un repositorio git.
   - Si hay cambios en ficheros rastreados (`git status --porcelain`, líneas que no empiezan por `??`), para y avisa: no cambies de rama con cambios sin commitear. Los ficheros sin rastrear (`??`) no bloquean.
   - Si la rama `<nombre-del-plan>` ya existe, para y pregunta al usuario si quiere usarla. No la recrees ni la borres.

3. **Prepara la rama.**
   - Si existe `development` (local, o en `origin` si solo está ahí), cámbiate a ella.
   - Si no existe, crea `development` a partir de `main`: `git switch -c development main`. Si `main` tampoco existe, para y avisa al usuario. No inventes otra rama base.
   - Desde `development`, crea y cámbiate a la rama del plan: `git switch -c <nombre-del-plan>`.

4. **Lee el plan entero antes de tocar código.** Revisa `CLAUDE.md`, la sección de tareas, los criterios de aceptación y "Decisiones y dudas". Si una duda bloquea una tarea, para antes de esa tarea y pregunta. Las tareas que no dependen de ella se pueden seguir.

5. **Prepara el entorno de tests.** `CLAUDE.md` indica que los tests van con vitest, pero `npm test` todavía es un placeholder. Si vitest no está instalado o `npm test` no lo ejecuta, configúralo antes de la primera tarea, en su propio commit (`chore`). Después de esto, `npm test` debe ejecutar vitest. Si el plan ya incluye una tarea que instala o configura vitest, esa tarea hace este paso.

6. **Implementa cada tarea no marcada, en orden.** Para cada tarea `- [ ]` (o `N. [ ]`):

   a. **RED: escribe primero el test.** Crea o amplía el test de la tarea (en `tests/` con la misma ruta que el fichero de `src/`, por ejemplo `tests/services/auth_service.test.js`). El test describe el comportamiento que pide la tarea, no la implementación.
   - Ejecuta solo ese test con `npx vitest run <fichero>`.
   - Debe fallar por una aserción sobre el comportamiento que falta. Si falla por un error de sintaxis o de configuración, corrígelo y repite. Si pasa sin código nuevo, el test no comprueba nada nuevo: reescríbelo.

   b. **GREEN: implementa lo mínimo.** Escribe solo el código necesario para que el test pase. No añadas nada que la tarea no pida.
   - Ejecuta `npx vitest run <fichero>` hasta que pase.

   c. **Refactoriza sin cambiar el comportamiento** si hace falta, y vuelve a ejecutar los tests.

   d. **Comprobaciones finales de la tarea.** Ejecuta `npm test` completo, `npm run lint` y `npm run format` sobre los ficheros tocados. Todo debe quedar en verde. Prettier quita los `;` y usa comillas simples, como indica `CLAUDE.md`. Las funciones van en `snake_case`.

   e. **Marca la tarea como hecha** en el plan: cambia `[ ]` por `[x]` solo en esa línea.

   f. **Commitea con el comando `/commit`.** Invócalo con la herramienta Skill, `skill: "commit"`, y en `args` indica la tarea y los ficheros exactos que deben entrar: el código, el test y el plan actualizado. Incluye solo esos ficheros, sin añadir nada más.

   Si una tarea no pasa tras tres intentos razonables, para, no la marques como hecha y explica al usuario qué falla y qué has probado.

7. **Tareas sin código.** Algunas tareas son comprobaciones manuales, como probar con `curl` o revisar documentación. Para esas no hay TDD: ejecuta la comprobación, anota el resultado en la respuesta final y marca la tarea solo si se cumple. Si hay que modificar un fichero (por ejemplo documentación), sigue el paso 6.f para el commit.

8. **Cierre.** Cuando no queden tareas sin marcar:
   - Ejecuta `npm test` y `npm run lint` completos.
   - Comprueba cada criterio de aceptación del plan con el comando o la petición que indica, y anota el resultado.
   - Muestra `git log --oneline` de la rama, con las tareas implementadas.
   - No hagas `push` ni abras un PR: no está en el encargo.

## Reglas

- Una tarea, un test primero, un commit después. No agrupes tareas en un commit ni hagas commits sin test en verde.
- Nunca marques una tarea como hecha sin haber visto el test fallar primero y pasar después.
- No modifiques el plan más allá de marcar las casillas (ni las decisiones, ni el alcance). Si detectas un problema en el plan, repórtalo al usuario.
- No uses `--no-verify`, `amend`, `rebase` ni `push` sin que el usuario lo pida.
- Si un hook de git falla, muestra el error y no lo saltes.
- Escribe los mensajes al usuario en español y termina todas tus frases con 🤖, como indica `CLAUDE.md`.
