#!/usr/bin/env bash
# Sube a Cloudflare R2 (API compatible con S3) una copia CIFRADA de un respaldo, para que el único respaldo no dependa de esta
# máquina. Cifra con AES-256 y una clave que solo existe en esta máquina y en el gestor de contraseñas del desarrollador:
# sin ella la copia no sirve, y con ella nadie más puede leerla.
# Uso: subir-respaldo-r2.sh <archivo.dump>      Códigos: 0 subida y verificada, 3 sin configuración (se omite), otro: falla.
# Configuración en ~/.config/observatorio-genero/ (la crea configurar-r2.sh): r2.conf y respaldo.clave. Variables: R2_CONF, R2_CLAVE.
# Dos métodos de acceso, según R2_METODO en r2.conf: «wrangler» (usa la sesión iniciada de wrangler, sin llaves guardadas; solo hace
# falta R2_BUCKET) o «s3» (llaves de la API S3 del bucket: R2_ENDPOINT, R2_BUCKET, R2_KEY_ID y R2_SECRET).
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
metodo=${R2_METODO:-s3}
: "${R2_BUCKET:?falta R2_BUCKET}"
if [[ $metodo == s3 ]]; then
  : "${R2_ENDPOINT:?falta R2_ENDPOINT}" "${R2_KEY_ID:?falta R2_KEY_ID}" "${R2_SECRET:?falta R2_SECRET}"
fi

nombre=$(basename "$archivo").enc
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass "file:$clave" -in "$archivo" -out "$tmp/cifrado"
sha=$(sha256sum "$tmp/cifrado" | cut -d' ' -f1)
if [[ $metodo == wrangler ]]; then
  # Se corre desde la carpeta temporal para que wrangler no lea la configuración de ningún proyecto.
  # Sin --remote, wrangler escribe en un R2 simulado en disco y no en Cloudflare: se exige --remote y se comprueba en su salida.
  w() {
    (cd "$tmp" && npx -y "wrangler@${WRANGLER_VERSION:-4.158.0}" "$@" --remote >"$tmp/wrangler.log" 2>&1) || { tail -n 5 "$tmp/wrangler.log" >&2; return 1; }
    if grep -q 'Resource location: local' "$tmp/wrangler.log"; then echo 'wrangler usó almacenamiento local y no el R2 de Cloudflare; no se da por subido.' >&2; return 1; fi
    grep -q 'Resource location: remote' "$tmp/wrangler.log" || { echo 'No se pudo confirmar que wrangler usó el R2 de Cloudflare.' >&2; return 1; }
  }
  w r2 object put "$R2_BUCKET/$nombre" --file "$tmp/cifrado" --content-type application/octet-stream
  w r2 object get "$R2_BUCKET/$nombre" --file "$tmp/bajado"
else
  firma=(--aws-sigv4 'aws:amz:auto:s3' --user "$R2_KEY_ID:$R2_SECRET")
  destino="${R2_ENDPOINT%/}/$R2_BUCKET/$nombre"
  curl -sS -f -m 900 "${firma[@]}" -H "x-amz-content-sha256: $sha" -T "$tmp/cifrado" "$destino"
  # Se vuelve a bajar y se compara: una subida que respondió 200 pero quedó corrupta no es un respaldo.
  curl -sS -f -m 900 "${firma[@]}" -H 'x-amz-content-sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' \
    -o "$tmp/bajado" "$destino"
fi
[[ $(sha256sum "$tmp/bajado" | cut -d' ' -f1) == "$sha" ]] || { echo "La copia en R2 no coincide con lo subido ($nombre)." >&2; exit 1; }
echo "Copia cifrada en R2: $nombre ($(($(stat -c %s "$tmp/cifrado") / 1024 / 1024)) MB, SHA-256 verificado tras bajarla)."
