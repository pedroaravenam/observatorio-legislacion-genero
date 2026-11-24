#!/usr/bin/env bash
# Construye las imágenes del commit actual en esta máquina, las sube al VPS y reinicia el sitio.
# Uso: despliegue/subir-version.sh [alias ssh]   (por defecto atendia-development)
# Cada imagen se sube por separado: podman guarda mal varias imágenes en un solo archivo docker-archive.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
vps=${1:-atendia-development}
version=$(git rev-parse --short HEAD)
[[ -z $(git status --porcelain) ]] || { echo 'Hay cambios sin commit: la versión no correspondería al código.' >&2; exit 2; }

docker build -q -t "localhost/observatorio-sitio:$version" sitio
docker build -q -t "localhost/observatorio-exportador:$version" -f exportador/Dockerfile .
docker build -q --target ingesta -t "localhost/observatorio-ingesta:$version" .

for imagen in sitio exportador ingesta; do
  docker save "localhost/observatorio-$imagen:$version" | gzip -1 | ssh -o BatchMode=yes "$vps" \
    "bash -o pipefail -c 'gunzip | sudo -n docker load -q >/dev/null' && sudo -n docker tag localhost/observatorio-$imagen:$version observatorio-$imagen:$version && sudo -n docker rmi localhost/observatorio-$imagen:$version >/dev/null"
done

tar -C despliegue -cf - compose.yaml trabajo.sh alertar.sh alerta.conf.ejemplo systemd | ssh -o BatchMode=yes "$vps" 'sudo -n tar -C /opt/observatorio -xf - --no-same-owner'
tar -C db -cf - changelog | ssh -o BatchMode=yes "$vps" 'sudo -n tar -C /opt/observatorio -xf - --no-same-owner'
ssh -o BatchMode=yes "$vps" "cd /opt/observatorio && sudo -n sed -i 's/^VERSION=.*/VERSION=$version/' .env && sudo -n docker compose -p observatorio up -d --wait --wait-timeout 120 sitio && sudo -n docker compose -p observatorio ps --format '{{.Name}} {{.Image}} {{.Status}}'"
echo "versión $version en $vps"
