#!/usr/bin/env bash
# Prueba de restauración: levanta un PostgreSQL desechable, restaura en él el último respaldo y compara el
# número de filas de las tablas principales con las del VPS. Un respaldo que no se restauró no cuenta como respaldo.
#   RESPALDOS    carpeta de respaldos (por defecto ~/respaldos/observatorio)
#   TOLERANCIA   filas que puede tener de menos frente al VPS, porque la ingesta sigue trabajando (200)
#   VPS          alias SSH del servidor (atendia-development)
set -euo pipefail
# Bajo systemd el PATH es mínimo y docker puede estar en ~/.local/bin.
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

vps=${VPS:-atendia-development}
destino=${RESPALDOS:-$HOME/respaldos/observatorio}
tolerancia=${TOLERANCIA:-200}
nombre=observatorio-prueba-restauracion
tablas=(proyecto_ley respuesta_cruda tramite_senado senado_observacion ingesta_ejecucion)

archivo=$(ls -1 "$destino"/ingesta-*.dump 2>/dev/null | tail -1 || true)
[[ -n $archivo ]] || { echo "No hay respaldos en $destino." >&2; exit 2; }
echo "Probando $(basename "$archivo")"
(cd "$destino" && sha256sum --check --quiet "$(basename "$archivo").sha256") && echo 'SHA-256 correcto.'

# Cualquier contenedor de esta prueba se elimina al terminar, haya salido bien o mal.
limpiar() { docker rm -f "$nombre" >/dev/null 2>&1 || true; }
trap limpiar EXIT
limpiar
docker run -d --rm --name "$nombre" -e POSTGRES_PASSWORD=prueba -e POSTGRES_DB=observatorio postgres:17 >/dev/null
for _ in $(seq 1 60); do
  docker exec "$nombre" pg_isready -U postgres -d observatorio >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$nombre" pg_isready -U postgres -d observatorio >/dev/null || { echo 'El PostgreSQL de prueba no arrancó.' >&2; exit 1; }

echo 'Restaurando...'
docker exec -i "$nombre" pg_restore -U postgres -d observatorio --no-owner --exit-on-error <"$archivo"

consulta=$(printf "select '%s', count(*) from %s;" "${tablas[0]}" "${tablas[0]}")
for t in "${tablas[@]:1}"; do consulta+=$(printf " select '%s', count(*) from %s;" "$t" "$t"); done
restaurado=$(docker exec -i "$nombre" psql -U postgres -d observatorio -At -F' ' -c "$consulta")
origen=$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$vps" "cd /opt/observatorio && sudo docker compose -p observatorio exec -T db psql -U observatorio -d observatorio -At -F' ' -c \"$consulta\"")

fallas=0
printf '%-24s %12s %12s  %s\n' tabla restaurado 'en el VPS' resultado
for t in "${tablas[@]}"; do
  r=$(awk -v t="$t" '$1 == t { print $2 }' <<<"$restaurado")
  o=$(awk -v t="$t" '$1 == t { print $2 }' <<<"$origen")
  if [[ -n $r && -n $o ]] && ((r > 0)) && ((r <= o)) && ((o - r <= tolerancia)); then ok=ok; else ok=FALLA; fallas=$((fallas + 1)); fi
  printf '%-24s %12s %12s  %s\n' "$t" "${r:-?}" "${o:-?}" "$ok"
done
((fallas == 0)) && echo 'La restauración es correcta.' || { echo "Falló la comparación en $fallas tabla(s)." >&2; exit 1; }
