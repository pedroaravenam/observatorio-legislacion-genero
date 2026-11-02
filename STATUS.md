# Estado del trabajo

## Resumen

Fecha: 2026-11-02. Último commit: primer corte independiente (este avance). Publicado: pendiente de crear y subir el repositorio público.

El proyecto independiente se llama Observatorio de Legislación de Género. Se separó código, pruebas y documentación técnica sin arrastrar historial ni documentación ajena al producto público. La Cámara, el Senado y la BCN permanecen como fuentes citadas. Los cuatro documentos técnicos se reunieron en `docs/documentacion-tecnica.md` y se redactaron para el proyecto independiente. El código se licencia con AGPL-3.0.

## Entorno

Repositorio local: `/home/pedroaravenam/Desarrollo/observatorio-legislativo-abierto`. No tiene remoto ni despliegue. La propuesta de primera publicación usa Cloudflare Pages para el sitio estático y archivos de datos generados por la ingesta, con R2 si hace falta. La ingesta actual en .NET y PostgreSQL se conserva provisionalmente; el rediseño del frontend puede hacerse en SvelteKit.

## Próximo paso exacto

Auditar y publicar el repositorio independiente; después, medir el tamaño real de la base, exportar una muestra y construir el sitio estático.

## Pendientes priorizados

1. Crear el remoto público y subir el primer commit.
2. Medir la base PostgreSQL completa y el tamaño de una exportación pública.
3. Rediseñar el frontend en SvelteKit con salida estática y estados de carga, vacío y error.
4. Construir el exportador de índices y fichas con procedencia y fecha de verificación.
5. Automatizar publicación y respaldos.
6. Revisar los términos de reutilización de datos de las tres fuentes.
7. Validar manualmente la selección temática preliminar.

## Riesgos activos

- La licencia del código no determina los términos de reutilización de los datos de terceros; falta revisar cada fuente antes de publicar una réplica masiva.
- La base de producción no se ha medido; 2–10 GB es solo una estimación de planificación.
- Si la ingesta permanece en la máquina local, una interrupción detiene las actualizaciones, aunque el sitio puede seguir mostrando la última versión.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Historial](docs/history/HISTORIAL.md)
