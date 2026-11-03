#!/usr/bin/env bash
# Deja la configuración de los avisos en el VPS sin que la llave de Resend se imprima ni pase por un chat.
# La llave se toma del portapapeles: se copia en el panel de Resend y se ejecuta, por ejemplo:
#   ALERTA_PARA=tu@correo.com despliegue/configurar-alertas.sh
# Variables: ALERTA_PARA (obligatoria), ALERTA_DE (por defecto alertas@legislaciongenero.cl),
#            FORZAR=1 para reemplazar una configuración existente, VPS (por defecto atendia-development).
set -euo pipefail

vps=${VPS:-atendia-development}
de=${ALERTA_DE:-alertas@legislaciongenero.cl}
para=${ALERTA_PARA:?Indique ALERTA_PARA con el correo que recibirá los avisos}
destino=/opt/observatorio/alerta.conf

[[ $para =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || { echo 'ALERTA_PARA no parece un correo.' >&2; exit 2; }
command -v wl-paste >/dev/null || { echo 'Falta wl-paste (paquete wl-clipboard).' >&2; exit 2; }

clave=$(wl-paste --no-newline 2>/dev/null | tr -d '[:space:]' || true)
if [[ ! $clave =~ ^re_[A-Za-z0-9_]{16,}$ ]]; then
  echo 'El portapapeles no tiene una llave de Resend (debe empezar con re_). Cópiala desde el panel y repite.' >&2
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
wl-copy --clear 2>/dev/null || true
echo "Configuración guardada en $vps:$destino (permisos 600). Se vació el portapapeles."

echo 'Enviando el correo de prueba...'
ssh -o BatchMode=yes "$vps" 'sudo /opt/observatorio/alertar.sh prueba'
