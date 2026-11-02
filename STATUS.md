# Estado del trabajo

## Resumen

Fecha: 2026-11-02. Último commit: publicación en GitHub (este avance). Publicado: código y documentación en `main`; sitio aún sin despliegue.

El proyecto independiente se llama Observatorio de Legislación de Género. Se separó código, pruebas y documentación técnica sin arrastrar historial ni documentación ajena al producto público. La Cámara, el Senado y la BCN permanecen como fuentes citadas. Los cuatro documentos técnicos se reunieron en `docs/documentacion-tecnica.md` y se redactaron para el proyecto independiente. El código se licencia con AGPL-3.0.

## Entorno

Repositorio público: https://github.com/pedroaravenam/observatorio-legislacion-genero. Repositorio local: `/home/pedroaravenam/Desarrollo/observatorio-legislativo-abierto`. El sitio aún no está desplegado. Cloudflare Pages puede alojar el sitio y sus archivos JSON de consulta en el mismo despliegue. No se requiere VPS ni Google Drive para la primera versión. Hay que construir y medir la exportación antes de publicar el sitio; R2 queda como opción si crecen los textos o el historial. La ingesta actual en .NET y PostgreSQL se conserva provisionalmente; el rediseño del frontend puede hacerse en SvelteKit.

## Próximo paso exacto

Medir el tamaño real de la base y de una exportación JSON para Cloudflare Pages; después adaptar el frontend a esos archivos.

## Pendientes priorizados

1. Medir la base PostgreSQL completa y el tamaño de una exportación pública.
2. Construir el exportador de índices y fichas con procedencia y fecha de verificación.
3. Rediseñar el frontend en SvelteKit con salida estática y estados de carga, vacío y error.
4. Automatizar publicación y respaldos.
5. Revisar los términos de reutilización de datos de las tres fuentes.
6. Validar manualmente la selección temática preliminar.

## Riesgos activos

- La licencia del código no determina los términos de reutilización de los datos de terceros; falta revisar cada fuente antes de publicar una réplica masiva.
- La base de producción no se ha medido; 2–10 GB es solo una estimación de planificación.
- Si la ingesta permanece en la máquina local, una interrupción detiene las actualizaciones, aunque el sitio puede seguir mostrando la última versión.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Historial](docs/history/HISTORIAL.md)
