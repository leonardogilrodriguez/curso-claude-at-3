---
name: plan-feature
description: Planifica una nueva funcionalidad o la corrección de un error con la plantilla del proyecto y guarda el plan en plans/. Úsalo cuando el usuario pida planificar una feature o un bug asociado a un número de issue.
argument-hint: <num_issue> <breve-descripcion>
---

# plan-feature

Crea un plan de implementación para una funcionalidad nueva o un error, siguiendo siempre la plantilla `.claude/skills/plan-feature/template.md`.

Argumentos recibidos: $ARGUMENTS

## Pasos

1. **Obtén los datos de entrada.** Necesitas el número de issue y una descripción breve. Si falta alguno, pregunta antes de seguir, porque el número forma parte del nombre del archivo. Indica también si es una feature o un bug, y deduce el tipo a partir de la descripción si el usuario no lo dice.

2. **Investiga antes de planificar.** Lee `CLAUDE.md` y los documentos que indique (por ejemplo `docs/arquitectura/arquitectura.md`). Revisa el código relacionado con el objetivo usando las capas de `src/` (routes, controllers, services, repositories, models, utils). No modifiques código ni hagas commits en esta fase.

3. **Rellena la plantilla.** Usa `.claude/skills/plan-feature/template.md` como base y rellena todas sus secciones, sin añadir ni quitar secciones:
   - **Objetivo y alcance:** separa claramente lo incluido de lo que queda fuera.
   - **Archivos afectados:** lista solo los archivos que vas a crear, modificar o borrar, con el motivo de cada uno.
   - **Tareas:** divídelas hasta que cada una se haga en 5-10 minutos. Si una tarea es más grande, divídela en varias. Indica el archivo principal de cada tarea y el tiempo estimado.
   - **Criterios de aceptación:** deben ser verificables, con un comando, una petición HTTP o una comprobación concreta. Evita criterios vagos como "funciona bien".
   - **Decisiones y dudas:** al final del plan, incluye cada decisión que hayas tomado por tu cuenta y cada duda que el usuario deba resolver. Si no hay ninguna, escribe "Ninguna".

4. **Guarda el archivo.** Crea la carpeta `plans/` en la raíz del proyecto si no existe y escribe el plan en:

   `plans/<num_issue>-<breve-descripcion>.md`

   La descripción va en minúsculas, sin acentos ni espacios (usa guiones), y debe ser corta, por ejemplo `plans/42-paginacion-vendehumos.md`.

5. **Resume el resultado.** Indica la ruta del archivo creado, el número de tareas y las decisiones o dudas que quedan abiertas.

## Reglas

- El plan está escrito en español y dirigido al equipo, así que debe leerse sin contexto adicional.
- No marques ninguna casilla como hecha: el plan se crea sin implementar nada.
- Si el archivo `plans/<num_issue>-<breve-descripcion>.md` ya existe, avisa antes de sobrescribirlo.
