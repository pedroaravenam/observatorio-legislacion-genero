-- Esquema de la base pública SQLite que lee el sitio.
-- Una fila por boletín: los trámites, autores y materias van en JSON dentro de la fila,
-- para que el sitio lea una ficha completa con una sola consulta.

CREATE TABLE IF NOT EXISTS proyecto (
  boletin            TEXT PRIMARY KEY,
  numero             INTEGER NOT NULL,          -- número sin dígito verificador, para ordenar
  titulo             TEXT NOT NULL,
  fecha_ingreso      TEXT,                      -- AAAA-MM-DD
  anno               INTEGER,
  iniciativa         TEXT,                      -- Mensaje o Moción
  camara_origen      TEXT,
  estado             TEXT,
  etapa              TEXT,
  subetapa           TEXT,
  urgencia           TEXT,
  ley_numero         TEXT,
  diario_oficial     TEXT,
  url_documento      TEXT,                      -- mensaje o moción en el Senado
  materias           TEXT NOT NULL DEFAULT '[]',  -- JSON: ["…"]
  autores            TEXT NOT NULL DEFAULT '[]',  -- JSON: ["Apellido Apellido, Nombre"]
  tramites           TEXT NOT NULL DEFAULT '[]',  -- JSON: [[fecha, sesión, descripción, etapa, cámara]]
  ultimo_tramite     TEXT,                      -- AAAA-MM-DD
  fuente             TEXT NOT NULL,
  actualizado        TEXT NOT NULL,             -- ISO 8601, última vez que se registró un cambio en la ficha
  verificado         TEXT,                      -- ISO 8601, última vez que el Senado entregó la ficha, haya cambiado o no
  autoria            TEXT NOT NULL DEFAULT 'sin_dato',  -- mujeres, hombres, mixta, ejecutivo o sin_dato
  autores_detalle    TEXT NOT NULL DEFAULT '[]'         -- JSON: [[nombre, sexo F o M o null, enlace a la reseña o null]]
);

CREATE INDEX IF NOT EXISTS proyecto_fecha ON proyecto (fecha_ingreso DESC, numero DESC);
CREATE INDEX IF NOT EXISTS proyecto_anno ON proyecto (anno);
CREATE INDEX IF NOT EXISTS proyecto_ultimo ON proyecto (ultimo_tramite DESC);
CREATE INDEX IF NOT EXISTS proyecto_autoria ON proyecto (autoria);

-- La tabla seleccion_genero vive en esquema-seleccion.sql y se recrea en cada publicación.

-- Búsqueda de texto completo sobre título, materias y autores.
CREATE VIRTUAL TABLE IF NOT EXISTS proyecto_busqueda USING fts5 (
  boletin UNINDEXED, titulo, materias, autores,
  content = 'proyecto', content_rowid = 'rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS proyecto_ai AFTER INSERT ON proyecto BEGIN
  INSERT INTO proyecto_busqueda (rowid, boletin, titulo, materias, autores)
  VALUES (new.rowid, new.boletin, new.titulo, new.materias, new.autores);
END;
CREATE TRIGGER IF NOT EXISTS proyecto_ad AFTER DELETE ON proyecto BEGIN
  INSERT INTO proyecto_busqueda (proyecto_busqueda, rowid, boletin, titulo, materias, autores)
  VALUES ('delete', old.rowid, old.boletin, old.titulo, old.materias, old.autores);
END;
CREATE TRIGGER IF NOT EXISTS proyecto_au AFTER UPDATE ON proyecto BEGIN
  INSERT INTO proyecto_busqueda (proyecto_busqueda, rowid, boletin, titulo, materias, autores)
  VALUES ('delete', old.rowid, old.boletin, old.titulo, old.materias, old.autores);
  INSERT INTO proyecto_busqueda (rowid, boletin, titulo, materias, autores)
  VALUES (new.rowid, new.boletin, new.titulo, new.materias, new.autores);
END;

-- Estado de la publicación, visible en el sitio.
CREATE TABLE IF NOT EXISTS publicacion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
