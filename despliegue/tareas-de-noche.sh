#!/usr/bin/env bash
# Tareas de la noche del Observatorio (03:00, hora de Chile), pensadas para gastar los créditos de los agentes cuando
# nadie trabaja. En orden:
#   1. Casos de control: cada versión del criterio se prueba una vez con Claude. Si no pasa, no corre.
#   2. Proyectos nuevos: el agente clasifica lo que ingresó y reclasifica lo decidido con un criterio anterior.
#   3. (Solo con REVISAR_V5=1) Pasada sobre la lista v5, con Con Claude. Sigue
#      hasta terminar o hasta que se agote su límite de uso; lo hecho queda guardado y se retoma la noche siguiente.
#   4. Niveles de relación con el género para los proyectos de la lista v5 que el agente mantiene, y publicación del sitio.
#   5. Un correo con el resumen, si hubo novedades.
# Se puede correr a mano. Variables: VPS, SOLO=ninguno para un ensayo sin agentes.
set -uo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")/.."

vps=${VPS:-atendia-development}
nodo=(node --disable-warning=ExperimentalWarning despliegue/clasificador/clasificar.mjs)
LIMITE=4
estado=${XDG_STATE_HOME:-$HOME/.local/state}/observatorio
mkdir -p "$estado"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
hoy=$(TZ=America/Santiago date +%F)
registro="$estado/noche-$hoy.log"
resumen=()
novedad=0
# Desde el 13 de noviembre de 2026 solo trabaja Claude (sonnet): en la comparación con los mismos casos, Codex (terra y sol) se equivocó
# con confianza alta en casos que Sonnet dejaba en duda, y esas decisiones no pasarían por la validación manual.
trabajadores=(claude)
[[ ${SOLO:-} == codex ]] && { echo 'Codex está excluido de las tareas de la noche.' >&2; exit 2; }
[[ ${SOLO:-} == ninguno ]] && trabajadores=()   # ensayo: prueba la lógica sin llamar a ningún agente

anotar() { resumen+=("$1"); echo "$1" | tee -a "$registro"; }
version=$("${nodo[@]}" version) || { echo 'No se pudo leer la versión del criterio.' >&2; exit 1; }
echo "== $(TZ=America/Santiago date '+%F %H:%M') · criterio $version" >>"$registro"

# 1. Casos de control. Devuelve 0 si el trabajador puede correr, 1 si no pasó, 2 si se agotó su límite.
puerta() {
  local rev=$1 marca="$estado/probado-$1"
  [[ $(cat "$marca" 2>/dev/null) == "$version" ]] && return 0
  REVISOR=$rev "${nodo[@]}" probar >"$tmp/probar-$rev.log" 2>&1
  local c=$?
  cat "$tmp/probar-$rev.log" >>"$registro"
  local linea; linea=$(grep -m1 '^Aciertos' "$tmp/probar-$rev.log" || echo 'sin resultado')
  novedad=1
  if ((c == 0)); then echo "$version" >"$marca"; anotar "Casos de control con $rev: ${linea}"; return 0; fi
  if ((c == LIMITE)); then anotar "$rev: se agotó el límite durante los casos de control; se reintenta mañana."; return 2; fi
  anotar "$rev NO pasó los casos de control (${linea}). No corre esta noche."; return 1
}

declare -A puede
for rev in "${trabajadores[@]}"; do puerta "$rev"; puede[$rev]=$?; done

# 2. Proyectos nuevos y decisiones del agente con un criterio anterior (siempre con Claude, que es lo que pasa la puerta del criterio).
if [[ ${puede[claude]:-9} == 0 ]]; then
  # Lo decidido con un criterio anterior se repasa en tandas de TANDA_REPASO (50) por noche, primero lo publicado.
  for modo in "pendientes" "pendientes --reclasificar --max ${TANDA_REPASO:-50}"; do
    REVISOR=claude "${nodo[@]}" $modo >"$tmp/paso.log" 2>&1
    c=$?
    cat "$tmp/paso.log" >>"$registro"
    linea=$(grep -m1 '^Decididos' "$tmp/paso.log" || true)
    cambios=$(grep -m1 '^Cambian' "$tmp/paso.log" || true)
    if [[ -n $linea && $linea != 'Decididos: 0 (incluye 0)'* ]]; then novedad=1; anotar "$modo: ${linea} ${cambios}"; fi
    ((c == LIMITE)) && { anotar 'Claude: se agotó el límite en los proyectos nuevos.'; puede[claude]=2; break; }
    ((c != 0)) && { novedad=1; anotar "$modo terminó con error (código $c); ver el registro $registro."; }
  done
fi

# 3. Pasada sobre la lista v5, en paralelo. Desde el 5 de noviembre de 2026 la revisión de la v5 está aceptada y aplicada, y cada
#    cambio de criterio la repetiría entera (más de mil llamadas): solo corre si se pide con REVISAR_V5=1.
pids=()
for rev in "${trabajadores[@]}"; do
  if [[ ${REVISAR_V5:-0} == 1 && ${puede[$rev]:-9} == 0 ]]; then
    ( REVISOR=$rev "${nodo[@]}" revisar-v5 >"$tmp/v5-$rev.log" 2>&1; echo $? >"$tmp/v5-$rev.codigo" ) &
    pids+=($!)
  fi
done
((${#pids[@]})) && wait "${pids[@]}"
for rev in "${trabajadores[@]}"; do
  [[ -f $tmp/v5-$rev.codigo ]] || continue
  cat "$tmp/v5-$rev.log" >>"$registro"
  c=$(cat "$tmp/v5-$rev.codigo")
  hechos=$(grep -E "^\[$rev\] [0-9]+ revisados" "$tmp/v5-$rev.log" | tail -1 | sed -E "s/^\[$rev\] ([0-9]+) revisados.*/\1/")
  hechos=${hechos:-0}
  if ((hechos > 0)); then novedad=1; fi
  case $c in
    0) ((hechos > 0)) && anotar "$rev revisó $hechos proyectos de la lista v5." ;;
    "$LIMITE") novedad=1; anotar "$rev revisó $hechos proyectos de la lista v5 y se detuvo porque se agotó su límite de uso." ;;
    *) novedad=1; anotar "$rev terminó con error (código $c) tras revisar $hechos proyectos; ver el registro $registro." ;;
  esac
done

# 4. Niveles para la lista v5 y publicación.
"${nodo[@]}" aplicar-niveles >"$tmp/niveles.log" 2>&1 && cat "$tmp/niveles.log" >>"$registro"
actualizados=$(sed -nE 's/.*: ([0-9]+)\.$/\1/p' "$tmp/niveles.log" | head -1)
if [[ ${actualizados:-0} -gt 0 ]]; then
  novedad=1
  ssh -o BatchMode=yes -o ConnectTimeout=20 "$vps" 'sudo /opt/observatorio/trabajo.sh publicar' >>"$registro" 2>&1 &&
    anotar "Niveles asignados a ${actualizados} proyectos de la lista v5 y sitio publicado." ||
    anotar "Se asignaron niveles a ${actualizados} proyectos, pero falló la publicación del sitio."
fi
# Casos límite que esperan la validación del desarrollador: se avisa siempre que haya, para que no queden olvidados.
en_cola=$("${nodo[@]}" cola --contar 2>/dev/null | tail -1)
if [[ ${en_cola:-0} =~ ^[0-9]+$ ]] && ((en_cola > 0)); then
  novedad=1
  anotar "Hay ${en_cola} casos límite pendientes de tu validación (no se publican hasta que los revises). Abre Claude Code en el proyecto y pide «revisemos los casos pendientes»."
fi
avance=$("${nodo[@]}" progreso 2>&1 | tail -1)
echo "$avance" >>"$registro"
((novedad)) && anotar "$avance"

# 5. Resumen por correo, solo si hubo novedades.
if ((novedad)); then
  printf '%s\n' "Resumen de las tareas de la noche (criterio $version):" '' "${resumen[@]}" '' "Registro completo: $registro" |
    ssh -o BatchMode=yes -o ConnectTimeout=20 "$vps" "sudo /opt/observatorio/alertar.sh aviso noche-resumen 'Observatorio: resultado de las tareas de la noche'" ||
    echo 'No se pudo enviar el resumen por correo.' >&2
fi
find "$estado" -name 'noche-*.log' -mtime +14 -delete 2>/dev/null
exit 0
