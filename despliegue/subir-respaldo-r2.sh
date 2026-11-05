#!/usr/bin/env bash
# Sube a Cloudflare R2 (API compatible con S3) una copia CIFRADA de un respaldo, para que el único respaldo no dependa de esta
# máquina. Cifra con AES-256 y una clave que solo existe en esta máquina y en el gestor de contraseñas del desarrollador:
# sin ella la copia no sirve, y con ella nadie más puede leerla.
# Uso: subir-respaldo-r2.sh <archivo.dump>      Códigos: 0 subida y verificada, 3 sin configuración (se omite), otro: falla.
# Configuración en ~/.config/observatorio-genero/ (la crea configurar-r2.sh): r2.conf y respaldo.clave. Variables: R2_CONF, R2_CLAVE.
# La retención se define con una regla de ciclo de vida del bucket (por ejemplo, borrar a los 30 días), no aquí.
set -euo pipefail
conf=${R2_CONF:-$HOME/.config/observatorio-genero/r2.conf}
clave=${R2_CLAVE:-$HOME/.config/observatorio-genero/respaldo.clave}
archivo=${1:?Indique el archivo de respaldo}
if [[ ! -r $conf || ! -r $clave ]]; then
  echo 'No hay configuración de R2 (r2.conf y respaldo.clave); no se hace la copia externa.' >&2
  exit 3
fi
# shellcheck disable=SC1090
source "$conf"
: "${R2_ENDPOINT:?falta R2_ENDPOINT}" "${R2_BUCKET:?falta R2_BUCKET}" "${R2_KEY_ID:?falta R2_KEY_ID}" "${R2_SECRET:?falta R2_SECRET}"

nombre=$(basename "$archivo").enc
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass "file:$clave" -in "$archivo" -out "$tmp/cifrado"
sha=$(sha256sum "$tmp/cifrado" | cut -d' ' -f1)
firma=(--aws-sigv4 'aws:amz:auto:s3' --user "$R2_KEY_ID:$R2_SECRET")
destino="${R2_ENDPOINT%/}/$R2_BUCKET/$nombre"

curl -sS -f -m 900 "${firma[@]}" -H "x-amz-content-sha256: $sha" -T "$tmp/cifrado" "$destino"
# Se vuelve a bajar y se compara: una subida que respondió 200 pero quedó corrupta no es un respaldo.
curl -sS -f -m 900 "${firma[@]}" -H 'x-amz-content-sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' \
  -o "$tmp/bajado" "$destino"
[[ $(sha256sum "$tmp/bajado" | cut -d' ' -f1) == "$sha" ]] || { echo "La copia en R2 no coincide con lo subido ($nombre)." >&2; exit 1; }
echo "Copia cifrada en R2: $nombre ($(($(stat -c %s "$tmp/cifrado") / 1024 / 1024)) MB, SHA-256 verificado tras bajarla)."
