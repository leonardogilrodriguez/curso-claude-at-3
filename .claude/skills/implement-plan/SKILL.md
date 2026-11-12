---
name: implement-plan
description: Lee con gh el plan publicado como comentario de una issue de GitHub, lo implementa tarea a tarea con TDD estricto en un git worktree dentro de .claude/worktrees (o varios si trabajan varios agentes), commitea con /commit y deja una PR abierta para revisión. Úsalo cuando el usuario pida implementar el plan de una issue indicando su número o URL.
argument-hint: <num_issue | url_issue>
---

# implement-plan

Implementa el plan de una issue, tarea a tarea, en un worktree y una rama propios, con TDD estricto, y deja la PR creada para que alguien la revise antes de mergearla.

Argumentos recibidos: $ARGUMENTS

## Pasos

1. **Obtén la issue y su plan.** El usuario debe indicar el número o la URL de la issue. Si falta, pregúntalo y no la adivines.
   - Comprueba `gh auth status`. Si `gh` no está instalado o autenticado, avisa y detente.
   - Lee la issue con `gh issue view <num_o_url> --json number,title,body,labels,state,comments,url`.
   - El plan es el comentario que lo contiene (lo publica la skill `plan-feature`: sigue la plantilla de `.claude/skills/plan-feature/template.md`, con tareas `- [ ]`, criterios de aceptación y "Decisiones y dudas"). Si hay varios comentarios con plan, usa el más reciente y dilo. Si no hay ninguno, para y sugiere ejecutar antes `plan-feature` con esa issue. No inventes un plan.
   - Si la issue está cerrada, avisa antes de continuar.
   - Guarda el cuerpo del comentario con el plan para escribirlo después en `plans/<rama>.md` (paso 4).

2. **Define el nombre de la rama.** Formato `<num_issue>-<breve-descripcion>`: el número de la issue y una descripción corta derivada de su título, en minúsculas, sin acentos ni espacios (usa guiones). Por ejemplo `42-paginacion-platos`. Si el plan ya existía como `plans/<num>-*.md` en el repositorio, reutiliza ese nombre.

3. **Comprueba el estado del repositorio.**
   - Confirma que estamos en un repositorio git y que existe el remoto `origin`.
   - No hace falta que el árbol esté limpio, porque el trabajo va en un worktree aparte y no toca el directorio actual.
   - Si la rama `<rama>` ya existe (local o en `origin`) o ya existe `.claude/worktrees/<rama>`, para y pregunta al usuario si quiere reutilizarla. No la recrees ni la borres.

4. **Crea el worktree y la rama.**
   - Asegúrate de que `.claude/worktrees/` no se commitea: si no está ignorado (`git check-ignore .claude/worktrees`), añade `.claude/worktrees/` a `.git/info/exclude`. No modifiques `.gitignore` por tu cuenta.
   - Rama base: `development` (actualízala con `git fetch origin`; si solo existe en `origin`, usa `origin/development`). Si `development` no existe, usa `main`. Si tampoco existe `main`, para y avisa. No inventes otra rama base.
   - Crea el worktree con la rama: `git worktree add .claude/worktrees/<rama> -b <rama> <base>`.
   - **Varios agentes.** Si el plan tiene bloques de tareas realmente independientes (por ejemplo API y frontend, sin ficheros compartidos) y vas a delegarlos en subagentes, crea un worktree por agente. Una misma rama no puede estar en dos worktrees, así que cada agente adicional trabaja en su propia rama `<rama>-<area>` (por ejemplo `42-paginacion-platos-web`) creada desde la misma base en `.claude/worktrees/<rama>-<area>`. Al terminar cada agente, fusiona su rama en `<rama>` desde el worktree principal (`git merge --no-ff`), resuelve los conflictos si los hay, y elimina después su worktree y su rama auxiliar. La PR se abre siempre desde `<rama>`. Si no hay independencia clara, usa un único worktree.
   - Trabaja siempre dentro del worktree (todas las rutas y comandos con ese directorio como raíz). No cambies de rama en el directorio principal.
   - En cada worktree ejecuta `npm install` antes de los tests, porque `node_modules` no se comparte.
   - Guarda el plan en `plans/<rama>.md` dentro del worktree (créalo si no existe) y commitéalo con `/commit` como primer commit de la rama (`docs`). Las casillas de ese archivo son las que se marcan después.

5. **Lee el plan entero antes de tocar código.** Revisa `CLAUDE.md`, la sección de tareas, los criterios de aceptación y "Decisiones y dudas". Si una duda bloquea una tarea, para antes de esa tarea y pregunta. Las tareas que no dependen de ella se pueden seguir.

6. **Prepara el entorno de tests.** Si el plan o `CLAUDE.md` indican cómo se ejecutan los tests (por ejemplo Vitest en `packages/api`), úsalo. Si falta algo para poder ejecutarlos, configúralo antes de la primera tarea, en su propio commit (`chore`).

7. **Implementa cada tarea no marcada, en orden.** Para cada tarea `- [ ]` (o `N. [ ]`):

   a. **RED: escribe primero el test.** Crea o amplía el test de la tarea siguiendo la convención del proyecto (ver `CLAUDE.md`). El test describe el comportamiento que pide la tarea, no la implementación.
   - Ejecútalo de forma aislada (por ejemplo `cd packages/api && npx vitest run <fichero>`).
   - Debe fallar por una aserción sobre el comportamiento que falta. Si falla por un error de sintaxis o de configuración, corrígelo y repite. Si pasa sin código nuevo, el test no comprueba nada nuevo: reescríbelo.

   b. **GREEN: implementa lo mínimo.** Escribe solo el código necesario para que el test pase. No añadas nada que la tarea no pida. Ejecuta el test hasta que pase.

   c. **Refactoriza sin cambiar el comportamiento** si hace falta, y vuelve a ejecutar los tests.

   d. **Comprobaciones finales de la tarea.** Ejecuta la suite completa del paquete tocado (`npm test`, o el comando que indique `CLAUDE.md`) y, si existe, el lint o el formateo del proyecto. Todo debe quedar en verde.

   e. **Marca la tarea como hecha** en `plans/<rama>.md`: cambia `[ ]` por `[x]` solo en esa línea.

   f. **Commitea con el comando `/commit`.** Invócalo con la herramienta Skill, `skill: "commit"`, y en `args` indica la tarea y los ficheros exactos que deben entrar: el código, el test y el plan actualizado. Incluye solo esos ficheros, sin añadir nada más. El commit se hace dentro del worktree.

   Si una tarea no pasa tras tres intentos razonables, para, no la marques como hecha y explica al usuario qué falla y qué has probado.

8. **Tareas sin código.** Algunas tareas son comprobaciones manuales, como probar con `curl` o revisar documentación. Para esas no hay TDD: ejecuta la comprobación, anota el resultado y marca la tarea solo si se cumple. Si hay que modificar un fichero (por ejemplo documentación), sigue el paso 7.f para el commit.

9. **Verificación final.** Cuando no queden tareas sin marcar:
   - Ejecuta los tests completos de los paquetes tocados (y la build del frontend si lo tocaste).
   - Comprueba cada criterio de aceptación del plan con el comando o la petición que indica, y anota el resultado.
   - Muestra `git log --oneline <base>..<rama>`.
   - Si falla algo, no abras la PR: informa al usuario de qué falla.

10. **Sube la rama y crea la PR.**
    - `git push -u origin <rama>` desde el worktree.
    - Crea la PR contra la rama base: `gh pr create --base <base> --head <rama> --title "<titulo>" --body-file <fichero>`. Usa `--body-file` con un fichero temporal (en el scratchpad, no en el repositorio).
    - Título: en formato Conventional Commits, derivado de la issue (por ejemplo `feat(api): paginación de platos`).
    - Cuerpo: resumen de los cambios, lista de tareas implementadas, resultado de cada criterio de aceptación, decisiones y dudas del plan que sigan abiertas y `Closes #<num_issue>`. Termina con la línea de atribución indicada por el sistema para PRs.
    - Crea la PR como normal, no como borrador, salvo que haya criterios sin cumplir o dudas abiertas: en ese caso usa `--draft` y dilo.
    - **No hagas merge** ni actives auto-merge: la PR debe revisarla alguien antes.

11. **Cierre.** Informa de la URL de la PR, la rama, la ruta del worktree, las tareas hechas, los criterios verificados y lo que quede abierto. Deja el worktree en su sitio para posibles correcciones tras la revisión; indica que se puede borrar con `git worktree remove .claude/worktrees/<rama>` una vez mergeada.

## Reglas

- Una tarea, un test primero, un commit después. No agrupes tareas en un commit ni hagas commits sin test en verde.
- Nunca marques una tarea como hecha sin haber visto el test fallar primero y pasar después.
- No modifiques el plan más allá de marcar las casillas (ni las decisiones, ni el alcance). Si detectas un problema en el plan, repórtalo al usuario. No edites el comentario de la issue.
- Todo el trabajo ocurre en el worktree de `.claude/worktrees/`. No toques el directorio principal ni sus ramas.
- Los únicos cambios en GitHub son el `push` de la rama y la creación de la PR. No hagas merge, no cierres la issue a mano, no edites sus etiquetas ni la rama base.
- No uses `--no-verify`, `amend`, `rebase` ni `push --force`.
- Si un hook de git falla, muestra el error y no lo saltes.
- Escribe los mensajes al usuario y la PR en español.
