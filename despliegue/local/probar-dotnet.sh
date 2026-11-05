#!/usr/bin/env bash
# Corre las migraciones y toda la suite .NET en contenedores desechables (esta máquina no tiene dotnet). Uso: probar-dotnet.sh
# Copia el código a una carpeta temporal para no dejar bin/obj en el repositorio, y al terminar elimina contenedor, red y volumen.
set -uo pipefail
R=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
T=$(mktemp -d)
red=obs-prueba-$$
cleanup() { docker rm -fv "$red-db" >/dev/null 2>&1; docker network rm "$red" >/dev/null 2>&1; rm -rf "$T"; }
trap cleanup EXIT
(cd "$R" && cp -r global.json Directory.Build.props Directory.Packages.props Observatorio.slnx src tests db "$T"/)
find "$T" \( -name bin -o -name obj \) -prune -exec rm -rf {} + 2>/dev/null
docker network create "$red" >/dev/null
docker run -d --name "$red-db" --network "$red" -e POSTGRES_DB=observatorio -e POSTGRES_USER=observatorio -e POSTGRES_PASSWORD=ci postgres:17 >/dev/null
for _ in $(seq 40); do docker exec "$red-db" pg_isready -U observatorio >/dev/null 2>&1 && break; sleep 1; done
docker run --rm --network "$red" -v "$T/db/changelog:/liquibase/changelog:ro,z" liquibase/liquibase:4.33.0 \
  --changelog-file=changelog/raiz.yaml --url="jdbc:postgresql://$red-db:5432/observatorio" --username=observatorio --password=ci update 2>&1 | grep -E "successfully|ERROR" | head -3
docker run --rm --network "$red" -v "$T:/fuente:z" -w /fuente \
  -e OBSERVATORIO_PRUEBAS_BD="Host=$red-db;Database=observatorio;Username=observatorio;Password=ci;GssEncryptionMode=Disable" \
  -e OBSERVATORIO_PRUEBAS_EXIGIR_BD=1 -e DOTNET_NOLOGO=1 -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
  mcr.microsoft.com/dotnet/sdk:10.0 dotnet test -c Release 2>&1 | grep -E "error|Failed|Passed!|Total" | head -40
