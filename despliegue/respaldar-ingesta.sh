#!/usr/bin/env bash
# Respaldo de la base de ingesta (PostgreSQL del VPS) en esta máquina. Lo ejecuta el temporizador de usuario
# observatorio-respaldo; también se puede correr a mano. El VPS no guarda credenciales de esta máquina:
# se conecta por SSH, vuelca la base, trae el archivo y comprueba con SHA-256 que llegó íntegro.
#   RESPALDOS     carpeta de destino (por defecto ~/respaldos/observatorio)
#   DIAS_DIARIOS  cuántos días seguidos se conservan (7)       SEMANAS  cuántas semanas se conserva el de los domingos (4)
#   VPS           alias SSH del servidor (atendia-development)
set -euo pipefail
# Bajo systemd el PATH es mínimo y docker puede estar en ~/.local/bin.
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

vps=${VPS:-atendia-development}
destino=${RESPALDOS:-$HOME/respaldos/observatorio}
dias_diarios=${DIAS_DIARIOS:-7}
semanas=${SEMANAS:-4}
minimo_bytes=${MINIMO_BYTES:-5000000}
ssh_opciones=(-o BatchMode=yes -o ConnectTimeout=20)

mkdir -p "$destino"
chmod 700 "$destino"
exec 9>"$destino/.cerrojo"
flock -n 9 || { echo 'Ya hay un respaldo en curso.' >&2; exit 1; }

registro=$(mktemp)
marca=$(date +%Y%m%d-%H%M)
final="$destino/ingesta-$marca.dump"
parcial="$final.parcial"
remoto="/var/tmp/observatorio-respaldo-$marca.dump"
limpiar() {
  rm -f "$registro" "$parcial"
  ssh "${ssh_opciones[@]}" "$vps" "rm -f $remoto" >/dev/null 2>&1 || true
}
trap limpiar EXIT

podar() {
  local hoy archivo nombre fecha edad
  hoy=$(date +%s)
  for archivo in "$destino"/ingesta-*.dump; do
    [[ -e $archivo ]] || continue
    nombre=$(basename "$archivo")
    fecha=${nombre#ingesta-}
    fecha=${fecha:0:8}
    edad=$(((hoy - $(date -d "$fecha" +%s)) / 86400))
    # Se conservan los últimos días, los domingos de las últimas semanas y siempre el más reciente.
    if ((edad < dias_diarios)) || { [[ $(date -d "$fecha" +%u) == 7 ]] && ((edad < semanas * 7)); } || [[ $archivo == "$final" ]]; then
      continue
    fi
    rm -f "$archivo" "$archivo.sha256"
    echo "Se eliminó el respaldo antiguo $nombre."
  done
}

respaldar() {
  echo "Volcando la base en $vps..."
  local sha_remoto sha_local bytes entradas
  sha_remoto=$(ssh "${ssh_opciones[@]}" "$vps" "set -e; cd /opt/observatorio
    sudo docker compose -p observatorio exec -T db pg_dump -U observatorio -d observatorio -Fc --no-owner > $remoto
    sha256sum $remoto | cut -d' ' -f1")
  ssh "${ssh_opciones[@]}" "$vps" "cat $remoto" >"$parcial"
  sha_local=$(sha256sum "$parcial" | cut -d' ' -f1)
  [[ $sha_local == "$sha_remoto" ]] || { echo "La suma SHA-256 no coincide (VPS $sha_remoto, local $sha_local)." >&2; return 1; }

  bytes=$(stat -c %s "$parcial")
  ((bytes >= minimo_bytes)) || { echo "El respaldo pesa solo $bytes bytes; se esperaban más de $minimo_bytes." >&2; return 1; }
  entradas=$(docker run --rm -i postgres:17 pg_restore --list <"$parcial" | grep -c '^[0-9]*;' || true)
  ((entradas > 20)) || { echo "El respaldo no se puede leer como volcado de PostgreSQL ($entradas entradas)." >&2; return 1; }

  mv "$parcial" "$final"
  chmod 600 "$final"
  printf '%s  %s\n' "$sha_local" "$(basename "$final")" >"$final.sha256"
  echo "Respaldo guardado: $final ($((bytes / 1024 / 1024)) MB, $entradas entradas, SHA-256 verificado)."
  # Señal de vida: la comprobación diaria del VPS avisa si pasan 48 horas sin esta marca.
  ssh "${ssh_opciones[@]}" "$vps" 'sudo mkdir -p /var/lib/observatorio-alertas && sudo touch /var/lib/observatorio-alertas/respaldo-ok'
  podar
}

if respaldar >"$registro" 2>&1; then
  cat "$registro"
else
  cat "$registro" >&2
  tail -n 30 "$registro" |
    ssh "${ssh_opciones[@]}" "$vps" "sudo /opt/observatorio/alertar.sh aviso respaldo-local 'Observatorio: falló el respaldo de la base de ingesta'" ||
    echo 'No se pudo enviar el aviso por correo.' >&2
  exit 1
fi
