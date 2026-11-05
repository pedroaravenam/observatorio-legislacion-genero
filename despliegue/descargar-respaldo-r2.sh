#!/usr/bin/env bash
# Baja de R2 una copia cifrada y la descifra, para restaurarla con pg_restore. Es el camino de recuperación si se pierden el VPS
# y esta máquina: hace falta la clave guardada en el gestor de contraseñas (archivo respaldo.clave) y las llaves de R2.
# Uso: descargar-respaldo-r2.sh <nombre-en-el-bucket.dump.enc> <destino.dump>
set -euo pipefail
conf=${R2_CONF:-$HOME/.config/observatorio-genero/r2.conf}
clave=${R2_CLAVE:-$HOME/.config/observatorio-genero/respaldo.clave}
nombre=${1:?Indique el nombre del objeto}
destino=${2:?Indique el archivo de destino}
# shellcheck disable=SC1090
source "$conf"
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
curl -sS -f -m 900 --aws-sigv4 'aws:amz:auto:s3' --user "$R2_KEY_ID:$R2_SECRET" \
  -H 'x-amz-content-sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' \
  -o "$tmp" "${R2_ENDPOINT%/}/$R2_BUCKET/$nombre"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass "file:$clave" -in "$tmp" -out "$destino"
chmod 600 "$destino"
echo "Respaldo descifrado en $destino"
