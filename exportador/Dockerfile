# Exportador: lee la base de ingesta (PostgreSQL) y reescribe la base pública SQLite del sitio.
# Se construye desde la raíz del repositorio: docker build -f exportador/Dockerfile .
FROM postgres:17
RUN apt-get update \
 && apt-get install -y --no-install-recommends sqlite3 \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY exportador/esquema.sql exportador/esquema-seleccion.sql exportador/exportar-proyectos.sql exportador/publicar.sh exportador/actualizar-esquema.sh ./
RUN chmod 0755 publicar.sh actualizar-esquema.sh
ENTRYPOINT ["/app/publicar.sh"]
