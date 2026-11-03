-- Selección de género publicada. Se recrea en cada publicación, dentro de la misma transacción que
-- los proyectos, para que el sitio nunca vea la tabla a medias ni una versión vieja del esquema.
DROP TABLE IF EXISTS seleccion_genero;
CREATE TABLE seleccion_genero (
  boletin     TEXT PRIMARY KEY,
  grupo       TEXT,                     -- tema_central o componente
  nivel_senal TEXT NOT NULL,            -- señal que decidió (ver etiquetaSenal en el sitio)
  version     TEXT NOT NULL,            -- v5 o la versión del agente
  codificador TEXT NOT NULL,            -- v5, agente o regla
  confianza   TEXT,                     -- alta, media o baja (solo agente)
  motivo      TEXT                      -- razón breve de la decisión (solo agente)
);
