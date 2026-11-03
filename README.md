# Observatorio de Legislación de Género

Proyecto independiente para seguir, explicar y consultar la tramitación de iniciativas legislativas relacionadas con género en Chile.

**Estado:** publicado en https://legislaciongenero.cl

## Principios

- Cada ficha enlaza a sus fuentes oficiales y muestra cuándo se verificó por última vez.
- La selección de iniciativas usa reglas públicas y revisables; una candidatura no se presenta como clasificación confirmada.
- El sitio puede consultarse sin cuenta y sin costo.
- La información se obtiene de servicios públicos de la Cámara de Diputadas y Diputados, el Senado y la Biblioteca del Congreso Nacional, con atribución clara.
- El proyecto no representa a esas instituciones ni usa sus marcas como identidad propia.

## Primer corte

1. Índice de proyectos de ley con número de boletín, título, estado y fuente.
2. Ficha con tramitación y enlace al registro oficial.
3. Buscador por número de boletín y palabras del título.
4. Fecha de última verificación y aviso cuando una fuente no responde.
5. Página pública que explica el criterio de selección y sus límites.

El alcance y los criterios de publicación están en [PLAN.md](PLAN.md).

## Origen del código

Este repositorio reúne el código y la documentación del proyecto independiente. El código se publica bajo [AGPL-3.0](LICENSE). El acceso al sitio es gratuito; una API alojada con mayor capacidad podría tener planes de pago sin cambiar la licencia del código.

## Estructura

| Carpeta | Qué contiene |
|---|---|
| `src/`, `db/`, `tests/` | Ingesta .NET y PostgreSQL desde las fuentes oficiales |
| `exportador/` | Exportación de la base de ingesta a la base pública SQLite |
| `despliegue/` | Compose, trabajos programados y script de publicación en el VPS |
| `sitio/` | Sitio público en SvelteKit con Node |
| `datos/referencia/` | Catálogo de títulos de boletines 1990–2026 que usa la carga completa del Senado |
| `datos/seleccion/` | Lista preliminar de la selección de género |
| `web/` | Frontend Angular del primer corte, reemplazado por `sitio/` |

## Documentación

- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento y capacidad](docs/alojamiento.md)
