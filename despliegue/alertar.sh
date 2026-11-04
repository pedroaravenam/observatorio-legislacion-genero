#!/usr/bin/env bash
# Avisos por correo del Observatorio, enviados con la API de Resend. Uso:
#   alertar.sh falla <unidad>   avisa que una unidad systemd terminó con error (la llama OnFailure=)
#   alertar.sh atraso           avisa si el sitio no responde, si sus datos tienen más de 36 horas o si no hay un respaldo reciente
#   alertar.sh aviso <clave> <asunto>   avisa con el texto que llega por la entrada estándar (lo usa el respaldo local)
#   alertar.sh prueba           envía un correo de prueba para validar la configuración
# Lee RESEND_API_KEY, ALERTA_DE y ALERTA_PARA de /opt/observatorio/alerta.conf (ver alerta.conf.ejemplo).
# Para no llenar la bandeja, avisa una sola vez por problema cada 20 horas.
set -euo pipefail

conf=${ALERTA_CONF:-/opt/observatorio/alerta.conf}
[[ -r $conf ]] || { echo "Falta $conf; copia alerta.conf.ejemplo y complétalo." >&2; exit 2; }
set -a
# shellcheck disable=SC1090
. "$conf"
set +a
: "${RESEND_API_KEY:?Falta RESEND_API_KEY en $conf}" "${ALERTA_DE:?Falta ALERTA_DE en $conf}" "${ALERTA_PARA:?Falta ALERTA_PARA en $conf}"

api=${RESEND_API_URL:-https://api.resend.com/emails}
sitio=${SITIO_URL:-https://legislaciongenero.cl}
horas_max=${ALERTA_HORAS_MAX:-36}
respaldo_horas=${ALERTA_RESPALDO_HORAS:-48}
estado=${ALERTA_ESTADO:-/var/lib/observatorio-alertas}

hora_chile() { TZ=America/Santiago date '+%d-%m-%Y %H:%M'; }

# Texto a cadena JSON entre comillas: sin caracteres de control ni bytes inválidos, con escapes y saltos de línea.
json() {
  printf '%s' "$1" | tr -d '\000-\010\013-\037' | iconv -c -f UTF-8 -t UTF-8 2>/dev/null |
    sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' |
    awk 'BEGIN { printf "\"" } NR > 1 { printf "\\n" } { printf "%s", $0 } END { printf "\"" }'
}

reciente() { [[ -n $(find "$estado/$1" -mmin -1200 2>/dev/null) ]]; }
marcar() { mkdir -p "$estado" && : >"$estado/$1"; }

enviar() { # asunto, cuerpo
  local carga salida codigo
  carga=$(printf '{"from":%s,"to":[%s],"subject":%s,"text":%s}' \
    "$(json "$ALERTA_DE")" "$(json "$ALERTA_PARA")" "$(json "$1")" "$(json "$2")")
  salida=$(mktemp)
  codigo=$(curl -sS --max-time 30 -o "$salida" -w '%{http_code}' -X POST "$api" \
    -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' \
    --data-binary "$carga") || codigo=000
  if [[ $codigo != 2* ]]; then
    echo "Resend respondió $codigo: $(head -c 500 "$salida")" >&2
    rm -f "$salida"
    return 1
  fi
  rm -f "$salida"
}

nombre_unidad() {
  case "$1" in
    observatorio-fecha*) echo 'la consulta diaria del Senado' ;;
    observatorio-completa*) echo 'la carga completa del Senado' ;;
    *) echo "$1" ;;
  esac
}

falla() {
  local unidad=${1:?Indique la unidad}
  local clave="falla-${unidad//[^a-zA-Z0-9_.-]/_}"
  if reciente "$clave"; then echo "Ya se avisó de $unidad hace menos de 20 horas."; return 0; fi
  local resultado registro
  resultado=$(systemctl show "$unidad" -p Result --value 2>/dev/null || echo desconocido)
  registro=$(journalctl -u "$unidad" -n 30 --no-pager -o short-iso 2>&1 || true)
  enviar "Observatorio: falló $(nombre_unidad "$unidad")" "$(printf '%s\n' \
    "Falló $(nombre_unidad "$unidad") (unidad $unidad)." \
    "Hora en Chile: $(hora_chile)" \
    "Resultado: $resultado" \
    '' \
    'Mientras no se repare, el sitio sigue en línea con los datos de la última ejecución que terminó bien.' \
    '' \
    'Para revisarlo y reintentar:' \
    '  ssh atendia-development' \
    "  sudo journalctl -u $unidad -n 100 --no-pager" \
    "  sudo systemctl start $unidad" \
    '' \
    'Últimas 30 líneas del registro:' \
    "$registro")"
  marcar "$clave"
  echo "Aviso enviado por la falla de $unidad."
}

atraso_datos() {
  local motivo= respuesta consultado epoch horas
  if ! respuesta=$(curl -fsS --max-time 20 "$sitio/estado.json" 2>&1); then
    motivo="El sitio no respondió en $sitio/estado.json: $respuesta"
  else
    consultado=$(printf '%s' "$respuesta" | sed -n 's/.*"consultado":"\([^"]*\)".*/\1/p')
    if [[ -z $consultado ]] || ! epoch=$(date -d "$consultado" +%s 2>/dev/null); then
      motivo="El sitio respondió, pero sin una fecha de última consulta válida: $(printf '%s' "$respuesta" | head -c 200)"
    else
      horas=$((($(date +%s) - epoch) / 3600))
      if ((horas > horas_max)); then
        motivo="Los datos del sitio tienen $horas horas: la última consulta exitosa al Senado fue el $consultado (límite: $horas_max horas)."
      fi
    fi
  fi
  if [[ -z $motivo ]]; then
    rm -f "$estado/atraso"
    echo "Datos al día (última consulta hace ${horas:-?} horas)."
    return 0
  fi
  if reciente atraso; then echo "Ya se avisó del atraso hace menos de 20 horas."; return 0; fi
  enviar 'Observatorio: los datos del sitio están atrasados o el sitio no responde' "$(printf '%s\n' \
    "$motivo" \
    "Hora en Chile: $(hora_chile)" \
    '' \
    'Puede ser que la consulta diaria no haya corrido, que haya fallado la publicación de la base o que el sitio esté caído.' \
    'Para revisarlo:' \
    '  ssh atendia-development' \
    '  systemctl list-timers "observatorio-*"' \
    '  sudo journalctl -u observatorio-fecha.service -n 100 --no-pager' \
    '  sudo docker compose -p observatorio ps')"
  marcar atraso
  echo 'Aviso enviado por el atraso.'
}

# Comprueba que un trabajo de otra máquina siga reportándose: ese trabajo toca una marca tras cada ejecución buena.
# Uso: atraso_marca <archivo de la marca> <clave del aviso> <horas> <qué es> <cómo revisarlo>
atraso_marca() {
  local marca="$estado/$1" clave=$2 horas=$3 que=$4 ayuda=$5
  if [[ ! -e $marca ]]; then echo "Aún no hay registros de $que; no se comprueba."; return 0; fi
  if [[ -z $(find "$marca" -mmin +"$((horas * 60))") ]]; then
    rm -f "$estado/$clave"
    echo "$que: reciente."
    return 0
  fi
  if reciente "$clave"; then echo "Ya se avisó de $que hace menos de 20 horas."; return 0; fi
  enviar "Observatorio: hace más de $horas horas que no hay $que" "$(printf '%s\n' \
    "La última vez fue el $(TZ=America/Santiago date -r "$marca" '+%d-%m-%Y %H:%M') (límite: $horas horas)." \
    "Hora en Chile: $(hora_chile)" \
    '' \
    'Puede ser que la máquina que lo ejecuta esté apagada, que no corra su temporizador o que el trabajo falle.' \
    'En esa máquina:' \
    "$ayuda")"
  marcar "$clave"
  echo "Aviso enviado por la falta de $que."
}

atraso_respaldo() {
  atraso_marca respaldo-ok atraso-respaldo "$respaldo_horas" 'un respaldo de la base' \
    "$(printf '%s\n' '  systemctl --user list-timers observatorio-respaldo.timer' '  journalctl --user -u observatorio-respaldo.service -n 50 --no-pager')"
}

atraso_clasificacion() {
  atraso_marca clasificacion-ok atraso-clasificacion "$respaldo_horas" 'una clasificación de proyectos nuevos' \
    "$(printf '%s\n' '  systemctl --user list-timers observatorio-noche.timer' '  journalctl --user -u observatorio-noche.service -n 50 --no-pager')"
}

atraso() {
  local fallo=0
  atraso_datos || fallo=1
  atraso_respaldo || fallo=1
  atraso_clasificacion || fallo=1
  return "$fallo"
}

aviso() {
  local clave="aviso-${1:?Indique la clave}" asunto=${2:?Indique el asunto}
  if reciente "$clave"; then echo "Ya se avisó de $1 hace menos de 20 horas."; return 0; fi
  enviar "$asunto" "$(cat)"
  marcar "$clave"
  echo "Aviso enviado: $1."
}

case "${1:-}" in
  aviso) aviso "${2:-}" "${3:-}" ;;
  falla) falla "${2:-}" ;;
  atraso) atraso ;;
  prueba) enviar 'Observatorio: correo de prueba' "$(printf '%s\n' \
    'Si lees esto, los avisos del Observatorio llegan bien.' "Hora en Chile: $(hora_chile)")" && echo 'Correo de prueba enviado.' ;;
  *) echo 'Uso: alertar.sh falla <unidad> | atraso | aviso <clave> <asunto> | prueba' >&2; exit 2 ;;
esac
