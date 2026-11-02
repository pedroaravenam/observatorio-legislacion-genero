# Alojamiento del Observatorio de Legislación de Género

## Arquitectura publicada (2 de noviembre de 2026)

| Pieza | Dónde corre | Costo |
|---|---|---|
| Ingesta .NET y base PostgreSQL con respuestas originales | Máquina local, con temporizadores de usuario | Sin costo |
| Exportación y publicación de datos (`exportador/`) | Máquina local, temporizador diario | Sin costo |
| Base pública | Cloudflare D1 | Plan gratuito |
| Sitio (SvelteKit) | Cloudflare Workers con archivos estáticos | Plan gratuito |
| Documentos completos (mensajes, mociones y leyes) | No se copian: se enlazan al Senado y a la BCN | Sin costo |

Se eligió Workers en vez de Pages porque el adaptador de SvelteKit para Cloudflare apunta a Workers con archivos estáticos, que es la vía que Cloudflare recomienda para proyectos nuevos. Ambos tienen el mismo plan gratuito. D1 reemplaza la exportación a JSON propuesta antes, porque permite búsqueda de texto completo (FTS5) y filtros combinados sin generar miles de archivos.

## Tamaño medido

| Qué | Tamaño |
|---|---|
| Base PostgreSQL local, con 18.627 respuestas originales del Senado | 227 MB |
| Trámites del Senado (199.853) en JSON | 28 MB |
| Exportación SQL completa (18.616 boletines) | 59 MB |
| Base D1 con 15.000 boletines, índices y búsqueda | 44,5 MB |

La base D1 completa se estima en ~55 MB, lejos del límite de 500 MB del plan gratuito.

## Límites que condicionan la operación

- **Filas escritas en D1:** 100.000 al día en el plan gratuito, con reinicio a las 00:00 UTC. Cada boletín escribe unas 6 filas (tabla, tres índices y búsqueda). La actualización diaria toca cientos de boletines; una carga inicial completa necesita dos días. `publicar.py` corta en 14.000 boletines por ejecución.
- **Tamaño de lote:** se envían archivos de 150 sentencias, cada una en una sola línea. Wrangler interpreta «--» como comentario aun dentro de un texto, por eso el exportador parte esa secuencia.
- **Disponibilidad de las fuentes:** medida desde esta máquina, 94,7 % en la Cámara, 93,6 % en el Senado y 81,8–98,8 % en la BCN. Afecta solo a los enlaces de documentos completos; los encabezados y la tramitación se sirven desde D1.
- **Lectura directa desde el navegador:** la Cámara permite CORS abierto; el Senado no envía cabeceras CORS y la BCN solo autoriza `bcn.cl`. Por eso el sitio no consulta las fuentes desde el navegador: usa los datos ya publicados y enlaces normales.

## Si la operación crece

- Si la máquina local deja de estar disponible, la ingesta puede pasar a GitHub Actions (gratuito en repositorios públicos), dividiendo la carga completa del Senado en tramos de menos de 6 horas.
- Si se decide alojar documentos completos, R2 ofrece 10 GB gratuitos sin costo por descarga. El expediente completo de todos los boletines no está medido; la estimación de orden de magnitud es de 100 a 400 GB.
