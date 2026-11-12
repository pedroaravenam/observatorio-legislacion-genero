#!/usr/bin/env bash
# Ensaya las migraciones pendientes sobre el último respaldo, en un PostgreSQL desechable: restaura, aplica el changelog
# con Liquibase y comprueba que la consulta del exportador y la cola de validación funcionan. No toca el VPS.
set -euo pipefail
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
raiz=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
destino=${RESPALDOS:-$HOME/respaldos/observatorio}
nombre=observatorio-prueba-migracion
archivo=$(ls -1 "$destino"/ingesta-*.dump | tail -1)
echo "Respaldo: $(basename "$archivo")"
limpiar() { docker rm -fv "$nombre" >/dev/null 2>&1 || true; }
trap limpiar EXIT
limpiar
docker run -d --rm --name "$nombre" -e POSTGRES_PASSWORD=prueba -e POSTGRES_DB=observatorio postgres:17 >/dev/null
for _ in $(seq 1 60); do docker exec "$nombre" pg_isready -U postgres -d observatorio >/dev/null 2>&1 && break; sleep 1; done
docker exec -i "$nombre" pg_restore -U postgres -d observatorio --no-owner --exit-on-error <"$archivo"
psql_() { docker exec -i "$nombre" psql -U postgres -d observatorio -X -q -v ON_ERROR_STOP=1 "$@"; }
echo "Antes: clasificacion_genero tiene $(psql_ -At -c 'select count(*) from clasificacion_genero') filas; validacion_genero existe: $(psql_ -At -c "select to_regclass('validacion_genero') is not null")"
docker run --rm --network "container:$nombre" -v "$raiz/db/changelog:/liquibase/changelog:ro" liquibase/liquibase:4.33.0 \
  --changelog-file=changelog/raiz.yaml --url=jdbc:postgresql://localhost:5432/observatorio --username=postgres --password=prueba update 2>&1 | tail -4
echo "Después: validacion_genero existe: $(psql_ -At -c "select to_regclass('validacion_genero') is not null")"
echo "Débiles publicados con confianza media o baja (irían a la cola): $(psql_ -At -c "select count(*) from clasificacion_genero where incluye and codificador='agente' and grupo='debil' and confianza in ('media','baja')")"
psql_ -c "INSERT INTO validacion_genero (boletin, estado, agente_incluye, agente_grupo, agente_confianza, agente_motivo, version)
  SELECT boletin, 'pendiente', incluye, grupo, confianza, motivo, version FROM clasificacion_genero WHERE incluye AND codificador='agente' AND grupo='debil' AND confianza IN ('media','baja') ON CONFLICT (boletin) DO NOTHING"
echo "Seleccionados antes de la cola: $(psql_ -At -c 'select count(*) from clasificacion_genero where incluye and nivel_senal is not null')"
echo "Seleccionados con el filtro del exportador: $(psql_ -At -c "select count(*) from clasificacion_genero c where incluye and nivel_senal is not null and not exists (select 1 from validacion_genero v where v.boletin=c.boletin and v.estado='pendiente')")"
echo 'Migración ensayada. El contenedor desechable se elimina al salir.'
