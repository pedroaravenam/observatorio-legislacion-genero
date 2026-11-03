#!/usr/bin/env bash
# Deja la configuración de los avisos en el VPS sin que la llave de Resend se imprima ni pase por un chat.
# Debe correrse en una terminal propia, no con «!» desde el chat.
# Pide la llave por pantalla, oculta: se copia en el panel de Resend y se pega al ejecutarlo, por ejemplo:
#   ALERTA_PARA=tu@correo.com despliegue/configurar-alertas.sh
# Variables: ALERTA_PARA (obligatoria), ALERTA_DE (por defecto alertas@legislaciongenero.cl),
#            FORZAR=1 para reemplazar una configuración existente, VPS (por defecto atendia-development).
set -euo pipefail

vps=${VPS:-atendia-development}
de=${ALERTA_DE:-alertas@legislaciongenero.cl}
para=${ALERTA_PARA:?Indique ALERTA_PARA con el correo que recibirá los avisos}
destino=/opt/observatorio/alerta.conf

[[ $para =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo 'ALERTA_PARA no parece un correo.' >&2; exit 2; }
# La llave se pega en la terminal, con la escritura oculta; no se imprime ni se pasa como argumento.
[[ -t 0 && -r /dev/tty ]] || { echo 'Ejecute el script en una terminal propia (no con «!» desde el chat): necesita pedir la llave.' >&2; exit 2; }
read -rsp 'Pega la llave de Resend y pulsa Enter (no se verá lo que pegas): ' clave </dev/tty
echo
clave=$(printf '%s' "$clave" | tr -d '[:space:]')
if [[ ! $clave =~ ^re_[A-Za-z0-9_]{16,}$ ]]; then
  echo 'Eso no parece una llave de Resend (debe empezar con re_ y no tener espacios). No se guardó nada.' >&2
  exit 2
fi

if [[ ${FORZAR:-} != 1 ]] && ssh -o BatchMode=yes "$vps" "sudo test -e $destino"; then
  echo "Ya existe $destino en $vps; use FORZAR=1 para reemplazarlo." >&2
  exit 3
fi

# La llave viaja por la entrada estándar de ssh: no queda en argumentos de procesos ni en el historial.
printf 'RESEND_API_KEY=%s\nALERTA_DE=%s\nALERTA_PARA=%s\n' "$clave" "$de" "$para" |
  ssh -o BatchMode=yes "$vps" "sudo sh -c 'umask 077 && cat > $destino' && sudo chmod 600 $destino && sudo chown root:root $destino"
unset clave
echo "Configuración guardada en $vps:$destino (permisos 600)."

echo 'Enviando el correo de prueba...'
ssh -o BatchMode=yes "$vps" 'sudo /opt/observatorio/alertar.sh prueba'
