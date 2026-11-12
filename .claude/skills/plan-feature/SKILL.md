---
name: plan-feature
description: Lee una issue de GitHub con gh, la planifica con la plantilla del proyecto, guarda el plan en plans/ y lo publica como comentario de la issue. Úsalo cuando el usuario pida planificar una feature o un bug indicando el número o la URL de la issue.
argument-hint: <num_issue | url_issue>
---

# plan-feature

Crea un plan de implementación para una funcionalidad nueva o un error a partir de una issue de GitHub, siguiendo siempre la plantilla `.claude/skills/plan-feature/template.md`.

Argumentos recibidos: $ARGUMENTS

## Pasos

1. **Obtén la issue.** El usuario debe indicar el número o la URL de la issue. Si falta, pregúntalo antes de seguir y no la adivines. Lee la issue con GitHub CLI (`gh`):

   `gh issue view <num_o_url> --json number,title,body,labels,state,comments,url`

   Si el usuario pasó una URL de otro repositorio, `gh issue view <url>` ya lo resuelve. Si `gh` no está instalado o no está autenticado (`gh auth status`), avisa al usuario y detente. Si la issue está cerrada, avisa antes de continuar. Usa el título, el cuerpo, las etiquetas y los comentarios como fuente de requisitos. Deduce si es una feature o un bug a partir de las etiquetas y el contenido, y pregunta solo si no queda claro. Si el cuerpo es demasiado ambiguo para planificar, pregunta al usuario.

2. **Investiga antes de planificar.** Lee `CLAUDE.md` y los documentos que indique (por ejemplo `docs/arquitectura/arquitectura.md`). Revisa el código relacionado con el objetivo usando las capas de `src/` (routes, controllers, services, repositories, models, utils). No modifiques código ni hagas commits en esta fase.

3. **Rellena la plantilla.** Usa `.claude/skills/plan-feature/template.md` como base y rellena todas sus secciones, sin añadir ni quitar secciones:
   - **Objetivo y alcance:** separa claramente lo incluido de lo que queda fuera.
   - **Archivos afectados:** lista solo los archivos que vas a crear, modificar o borrar, con el motivo de cada uno.
   - **Tareas:** divídelas hasta que cada una se haga en 5-10 minutos. Si una tarea es más grande, divídela en varias. Indica el archivo principal de cada tarea y el tiempo estimado.
   - **Criterios de aceptación:** deben ser verificables, con un comando, una petición HTTP o una comprobación concreta. Evita criterios vagos como "funciona bien".
   - **Decisiones y dudas:** al final del plan, incluye cada decisión que hayas tomado por tu cuenta y cada duda que el usuario deba resolver. Si no hay ninguna, escribe "Ninguna".

4. **Guarda el archivo.** Crea la carpeta `plans/` en la raíz del proyecto si no existe y escribe el plan en:

   `plans/<num_issue>-<breve-descripcion>.md`

   El número es el de la issue. La descripción se deriva del título de la issue: minúsculas, sin acentos ni espacios (usa guiones) y corta, por ejemplo `plans/42-paginacion-vendehumos.md`.

5. **Publica el plan en la issue.** Una vez guardado el archivo, añádelo como comentario de la issue con el contenido completo del plan:

   `gh issue comment <num_o_url> --body-file plans/<num_issue>-<breve-descripcion>.md`

   Usa `--body-file` y no `--body`, para no tener problemas con comillas ni saltos de línea. Si el comando falla, no reintentes en bucle: informa del error y deja el archivo guardado.

6. **Resume el resultado.** Indica la ruta del archivo creado, la URL del comentario publicado en la issue, el número de tareas y las decisiones o dudas que quedan abiertas.

## Reglas

- El plan está escrito en español y dirigido al equipo, así que debe leerse sin contexto adicional.
- No marques ninguna casilla como hecha: el plan se crea sin implementar nada.
- Si el archivo `plans/<num_issue>-<breve-descripcion>.md` ya existe, avisa antes de sobrescribirlo.
- El comentario de la issue es el único cambio que se hace en GitHub: no edites la issue, ni sus etiquetas, ni la cierres.
- Comenta una sola vez por ejecución. Si la issue ya tiene un comentario con un plan anterior, menciónalo al usuario antes de publicar uno nuevo.
