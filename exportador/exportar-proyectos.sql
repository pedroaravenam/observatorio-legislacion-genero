-- Genera sentencias SQLite (D1) con los encabezados y trámites de cada boletín.
-- Se ejecuta con psql -At contra la base de ingesta; la variable desde (ISO 8601) limita
-- la exportación a los boletines consultados después de esa fecha.
-- Uso: psql -At -v desde='1900-01-01' -f exportar-proyectos.sql > proyectos.sql

\set ON_ERROR_STOP 1

CREATE TEMP TABLE ficha AS
SELECT p.id, p.boletin, p.titulo, p.fecha_ingreso, p.estado_senado, p.etapa_senado, p.subetapa_senado,
       p.fuente, coalesce(p.fecha_consulta_senado, p.fecha_consulta) AS verificado,
       t.nombre AS iniciativa, c.nombre AS camara_origen,
       CASE WHEN xml_is_well_formed_document(r.contenido)
            THEN (xpath(format('/proyectos/proyecto[descripcion/boletin="%s"]', p.boletin), r.contenido::xml))[1]
       END AS x
FROM proyecto_ley p
LEFT JOIN tipo_iniciativa t ON t.id = p.tipo_iniciativa_id
LEFT JOIN camara c ON c.id = p.camara_origen_id
LEFT JOIN respuesta_cruda r ON r.id = p.respuesta_senado_id
WHERE coalesce(p.fecha_consulta_senado, p.fecha_consulta) >= :'desde'::timestamptz;

-- Literal SQLite en una sola línea: comillas simples duplicadas, sin secuencias de escape.
-- Los saltos de línea pasan a espacios y «--» se escribe como '-' || '-', porque wrangler
-- separa las sentencias del archivo y trata «--» como inicio de comentario incluso dentro de un texto.
CREATE FUNCTION pg_temp.lit(v text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT CASE WHEN v IS NULL THEN 'NULL'
          ELSE '''' || regexp_replace(replace(regexp_replace(v, '[\r\n]+', ' ', 'g'), '''', ''''''), '-(?=-)', '-'' || ''', 'g') || ''''
     END $$;

-- Texto de un nodo XML: decodifica entidades y normaliza espacios.
CREATE FUNCTION pg_temp.plano(v text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT nullif(btrim(regexp_replace(replace(replace(replace(replace(replace(v,
     '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&apos;', ''''), '&amp;', '&'), '\s+', ' ', 'g')), '') $$;

CREATE FUNCTION pg_temp.texto(x xml, ruta text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT pg_temp.plano((xpath(ruta, x))[1]::text) $$;

CREATE FUNCTION pg_temp.lista(x xml, ruta text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT coalesce(json_agg(v ORDER BY o), '[]')::text
   FROM (SELECT pg_temp.plano(e::text) v, o
         FROM unnest(xpath(ruta, x)) WITH ORDINALITY AS u(e, o)) s
   WHERE v IS NOT NULL $$;

SELECT format(
  'INSERT INTO proyecto (boletin, numero, titulo, fecha_ingreso, anno, iniciativa, camara_origen, estado, etapa, subetapa, urgencia, ley_numero, diario_oficial, url_documento, materias, autores, tramites, ultimo_tramite, fuente, actualizado) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (boletin) DO UPDATE SET numero = excluded.numero, titulo = excluded.titulo, fecha_ingreso = excluded.fecha_ingreso, anno = excluded.anno, iniciativa = excluded.iniciativa, camara_origen = excluded.camara_origen, estado = excluded.estado, etapa = excluded.etapa, subetapa = excluded.subetapa, urgencia = excluded.urgencia, ley_numero = excluded.ley_numero, diario_oficial = excluded.diario_oficial, url_documento = excluded.url_documento, materias = excluded.materias, autores = excluded.autores, tramites = excluded.tramites, ultimo_tramite = excluded.ultimo_tramite, fuente = excluded.fuente, actualizado = excluded.actualizado;',
  pg_temp.lit(f.boletin),
  split_part(f.boletin, '-', 1)::int,
  pg_temp.lit(btrim(regexp_replace(f.titulo, '\s+', ' ', 'g'))),
  pg_temp.lit(f.fecha_ingreso::text),
  coalesce(extract(year FROM f.fecha_ingreso)::int::text, 'NULL'),
  pg_temp.lit(f.iniciativa),
  pg_temp.lit(f.camara_origen),
  pg_temp.lit(nullif(btrim(f.estado_senado), '')),
  pg_temp.lit(nullif(btrim(f.etapa_senado), '')),
  pg_temp.lit(nullif(nullif(btrim(f.subetapa_senado), ''), '/')),
  pg_temp.lit(pg_temp.texto(f.x, '/proyecto/descripcion/urgencia_actual/text()')),
  pg_temp.lit(pg_temp.texto(f.x, '/proyecto/descripcion/leynro/text()')),
  pg_temp.lit(to_char(to_date(substring(pg_temp.texto(f.x, '/proyecto/descripcion/diariooficial/text()') FROM '^\d{2}/\d{2}/\d{4}$'), 'DD/MM/YYYY'), 'YYYY-MM-DD')),
  pg_temp.lit(replace(pg_temp.texto(f.x, '/proyecto/descripcion/link_mensaje_mocion/text()'), 'http://', 'https://')),
  pg_temp.lit(coalesce(pg_temp.lista(f.x, '/proyecto/materias/materia/DESCRIPCION/text()'), '[]')),
  pg_temp.lit(coalesce(pg_temp.lista(f.x, '/proyecto/autores/autor/PARLAMENTARIO/text()'), '[]')),
  pg_temp.lit(coalesce(tr.json, '[]')),
  pg_temp.lit(tr.ultimo::text),
  pg_temp.lit(f.fuente),
  pg_temp.lit(to_char(f.verificado AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
)
FROM ficha f
LEFT JOIN LATERAL (
  SELECT json_agg(json_build_array(s.fecha, nullif(btrim(s.sesion), '/'), btrim(regexp_replace(regexp_replace(s.descripcion, '\s+', ' ', 'g'), ' ([.,])', '\1', 'g')),
                                   btrim(s.etapa), btrim(s.camara)) ORDER BY s.posicion)::text AS json,
         max(s.fecha) AS ultimo
  FROM tramite_senado s WHERE s.proyecto_id = f.id
) tr ON true
ORDER BY f.boletin;

-- Última consulta exitosa al Senado (diaria o completa). Se toma de las ejecuciones y no de las fichas,
-- porque la fecha de cada ficha solo avanza cuando su contenido cambia.
SELECT format('INSERT INTO publicacion (clave, valor) VALUES (''senado_consultado'', %s) ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor;',
              pg_temp.lit(to_char(max(termino) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
FROM ingesta_ejecucion
WHERE proceso IN ('senado.fecha', 'senado.completa') AND estado = 1
HAVING max(termino) IS NOT NULL;
