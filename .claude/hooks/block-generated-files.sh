#!/usr/bin/env bash
# PreToolUse (Edit|Write): bloquea ediciones en ficheros generados o binarios.
# Recibe el JSON de la herramienta por stdin. Sale con 2 para bloquear.

file_path=$(jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

case "$file_path" in
  */packages/api/resttek.db|*/dist/*|dist/*|*/.angular/*|.angular/*|*/node_modules/*|node_modules/*)
    echo "Bloqueado: '$file_path' es un fichero generado o binario (BD SQLite, dist, .angular o node_modules). Edita su fuente en su lugar." >&2
    exit 2
    ;;
esac

exit 0
