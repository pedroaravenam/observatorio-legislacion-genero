# Historial

## 2026-11-02 — Sitio público en Cloudflare con datos del Senado (commit de este avance)

Se publicó el sitio en Cloudflare Workers con SvelteKit, que reemplaza al frontend Angular como interfaz pública, y una base Cloudflare D1. El exportador lee la base de ingesta local, extrae de la respuesta original del Senado la urgencia, el número de ley, la fecha del Diario Oficial, el enlace al mensaje o moción, las materias y los autores, y genera una fila por boletín con sus trámites en JSON. Se exportaron 18.616 boletines en 51 segundos. En D1 quedaron 15.000, incluida toda la selección de género; los 3.616 más antiguos esperan el reinicio del límite diario de 100.000 filas escritas, porque cada boletín escribe unas 6. Durante la carga se encontraron títulos con saltos de línea y textos con «--», que wrangler interpreta como comentario; el exportador ahora escribe cada sentencia en una sola línea y parte esa secuencia. La fecha global del sitio se toma de la última ejecución exitosa y no de las fichas, porque la fecha de cada ficha solo avanza cuando cambia su contenido. Pruebas: 4 pruebas unitarias del formato y la búsqueda, revisión de tipos sin errores, recorrido de 12 rutas en local y 7 en producción, y revisión con Chromium sin interfaz a 375 y 1.280 px en modo claro y oscuro (sin desbordes, todos los campos con etiqueta, áreas táctiles de 44 px y foco visible). El temporizador de publicación diaria quedó escrito, pero no instalado.

## 2026-11-02 — Repositorio público iniciado en GitHub (commit de este avance)

Se creó `pedroaravenam/observatorio-legislacion-genero` como repositorio público y se subió `main` con el código, la licencia AGPL-3.0 y la documentación independiente. El sitio aún requiere exportar datos y adaptar el frontend antes de desplegarlo en Cloudflare Pages.

## 2026-11-02 — Alojamiento inicial en Cloudflare Pages (commit de este avance)

Se aclaró que Pages puede servir tanto el sitio como archivos JSON de consulta en la primera versión, sin VPS ni Google Drive. El frontend actual aún debe adaptarse a la exportación estática. Se registraron los límites de archivos y la necesidad de medir el volumen antes del despliegue.

## 2026-11-02 — Primer corte independiente (commit de este avance)

Se creó un repositorio independiente con código, pruebas y documentación técnica. Se mantuvo la atribución de las fuentes oficiales, se reunió la documentación técnica en un solo archivo y se adoptó AGPL-3.0 para el código. Se documentó una opción de publicación estática en Cloudflare Pages y una estimación inicial de capacidad, pendiente de medición real.
