#!/usr/bin/env bash
# Guarda la configuración de la copia externa del respaldo (Cloudflare R2) en esta máquina, sin pasar por ningún chat:
# las llaves se escriben en TU terminal y no se muestran. Crea ~/.config/observatorio-genero/r2.conf y respaldo.clave (600).
# Antes, en el panel de Cloudflare: R2 > crear un bucket privado (por ejemplo observatorio-respaldos) > «Administrar tokens de la
# API de R2» > token con permiso «Object Read & Write» limitado a ese bucket. Opcional pero recomendable: en el bucket, una regla
# de ciclo de vida que borre los objetos a los 30 días.
set -euo pipefail
dir=$HOME/.config/observatorio-genero
mkdir -p "$dir" && chmod 700 "$dir"
read -r -p 'Endpoint S3 de R2 (https://<id-de-cuenta>.r2.cloudflarestorage.com): ' endpoint
read -r -p 'Nombre del bucket: ' bucket
read -r -p 'Access Key ID: ' id
read -r -s -p 'Secret Access Key (no se muestra): ' secreto; echo
umask 077
printf 'R2_ENDPOINT=%q\nR2_BUCKET=%q\nR2_KEY_ID=%q\nR2_SECRET=%q\n' "$endpoint" "$bucket" "$id" "$secreto" > "$dir/r2.conf"
if [[ ! -e $dir/respaldo.clave ]]; then
  openssl rand -base64 48 > "$dir/respaldo.clave"
  echo "Se creó la clave de cifrado en $dir/respaldo.clave."
  echo 'GUÁRDALA AHORA en tu gestor de contraseñas (por ejemplo: cat ese archivo y copiar). Sin ella, las copias de R2 no se pueden leer.'
fi
echo 'Listo. Prueba: despliegue/subir-respaldo-r2.sh ~/respaldos/observatorio/<un .dump>'
