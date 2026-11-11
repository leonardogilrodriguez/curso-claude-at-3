---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [descripción opcional del cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git rev-parse:*)
---

Crea un commit para los cambios actuales siguiendo la especificación Conventional Commits 1.0.0.

Indicación del usuario (opcional): $ARGUMENTS

## Pasos

1. Comprueba que estamos en un repositorio git con `git rev-parse --is-inside-work-tree`. Si no lo es, dilo y para.
2. Revisa el estado con `git status`, `git diff --staged` y `git diff`.
3. Si ya hay cambios en staging, commitea solo eso. Si no hay nada en staging, añade los cambios relacionados con la indicación del usuario (o todos los cambios si no hay indicación). Nunca añadas `.env`, `node_modules/`, `data/` ni ficheros con credenciales; si aparecen, avisa en vez de añadirlos.
4. Redacta el mensaje de commit:
   - Cabecera: `<tipo>[ámbito opcional][!]: <descripción>`
   - Tipos permitidos: `feat` (nueva funcionalidad), `fix` (corrección de error), `docs`, `style` (formato sin cambios de lógica), `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
   - Ámbito: la parte del proyecto afectada, en minúsculas (por ejemplo `vendehumos`, `db`, `lint`). Omítelo si el cambio es transversal.
   - `!` tras el tipo o el ámbito solo si el cambio rompe compatibilidad. En ese caso, añade un pie `BREAKING CHANGE: <explicación>`.
   - Descripción en español, en minúsculas, en imperativo y sin punto final, de máximo 72 caracteres en la cabecera.
   - Cuerpo opcional, separado por una línea en blanco, para explicar el porqué del cambio.
5. Commitea usando un heredoc para respetar los saltos de línea. El mensaje debe terminar con esta línea:

   Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>

6. Ejecuta `git log -1 --oneline` y muestra el resultado.

## Reglas

- Un commit por cambio lógico. Si los cambios no están relacionados, avisa y propón dividirlos en lugar de mezclarlos.
- No hagas `push`, `amend`, `rebase` ni `--no-verify` salvo que el usuario lo pida explícitamente.
- Si un hook de git falla, muestra el error y no lo saltes.
