#!/usr/bin/env bash
# Extrae de una copia restaurada del respaldo (contenedor obs-ml-copia, ver README) los TSV que usan los scripts.
# Uso: extraer.sh CARPETA_DE_SALIDA     Solo lee; no toca el VPS.
set -euo pipefail
s=${1:?carpeta de salida}; n=${CONTENEDOR:-obs-ml-copia}; mkdir -p "$s"
q() { docker exec "$n" psql -U postgres -d observatorio -At -F $'\t' -c "$1"; }
q "select boletin, incluye::int, coalesce(grupo,''), codificador from clasificacion_genero where codificador='desarrollador'" >"$s/humanos.tsv"
q "select boletin, incluye::int, coalesce(nivel_senal,''), coalesce(grupo,''), codificador from clasificacion_genero where codificador in ('regla','claude','v5') and (incluye or random()<0.1)" >"$s/auto.tsv"
q "select v.boletin, v.veredicto::int, btrim(regexp_replace(p.titulo,'\s+',' ','g')) from validacion_genero v join proyecto_ley p on p.boletin=v.boletin where v.estado='validado'" >"$s/val.tsv"
