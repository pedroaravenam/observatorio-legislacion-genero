#!/usr/bin/env bash
set -euo pipefail

# Ejecutar desde la máquina que ya tiene acceso SSH al VPS del Observatorio.
# Emite solo los veredictos validados, sin motivos ni datos de conexión.
ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20 \
  "${VPS:-atendia-development}" \
  'cd /opt/observatorio && sudo -n docker compose -p observatorio exec -T db psql -U observatorio -d observatorio -X -qAt -v ON_ERROR_STOP=1 -f -' <<'SQL'
BEGIN READ ONLY;

SELECT COALESCE(
  json_agg(json_build_object(
    'boletin', v.boletin,
    'titulo', p.titulo,
    'incluye', v.veredicto,
    'validado', to_char(v.validado AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')
  ) ORDER BY v.validado, v.boletin),
  '[]'::json
)
FROM validacion_genero v
JOIN proyecto_ley p ON p.boletin = v.boletin
WHERE v.estado = 'validado' AND v.veredicto IS NOT NULL;

COMMIT;
SQL
