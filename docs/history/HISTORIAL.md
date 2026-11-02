# Historial

## 2026-11-02 — Temporizadores instalados en el VPS (commit de este avance)

El desarrollador instaló y activó `observatorio-fecha.timer` (09:00) y `observatorio-completa.timer` (01:00), en hora de Chile. Según `systemctl list-timers`, la primera ejecución será la carga completa del 3 de noviembre a las 04:00 UTC.

## 2026-11-02 — Retiro de Cloudflare (commit de este avance)

A pedido del desarrollador, se borraron el Worker `observatorio-legislacion-genero` y la base D1 del mismo nombre. La dirección `workers.dev` ahora responde 404. No se tocaron los demás proyectos de la cuenta.

## 2026-11-02 — Sitio, ingesta y base movidos al VPS (commit de este avance)

Se trasladó el observatorio completo al VPS Hetzner compartido con Atendia, en el proyecto Compose `observatorio` (`/opt/observatorio`). El sitio pasó de Cloudflare Workers con D1 a SvelteKit con `adapter-node`, y ahora lee una base SQLite con `node:sqlite`, sin dependencias nativas; las consultas y la búsqueda FTS5 no cambiaron. El exportador dejó de enviar lotes a D1 con wrangler: una imagen con psql y sqlite3 reescribe la base pública completa en una sola transacción. La base de ingesta se restauró desde la máquina local (`pg_dump` de 30 MB, 18.616 boletines) y el primer volcado tomó 2,5 minutos, con el VPS ocupado por una compilación de la plataforma educativa. Así quedaron publicados también los 3.616 boletines de 1990 a 1996 que no habían entrado en D1 por el límite diario. Se agregó al repositorio el catálogo de títulos que usa la carga completa del Senado. HTTPS se sirve con el Caddy de la plataforma educativa: se agregó un bloque `observatorio.116-203-181-6.sslip.io` y la red `observatorio-edge`, con respaldos. Agenda, plataforma y redirección de Centro Alma respondieron igual después de recargar Caddy. Hubo un tropiezo: `podman save` con tres imágenes dejó las tres etiquetas apuntando a la imagen del sitio, así que ahora se suben por separado (`despliegue/subir-version.sh`). Pruebas: tipos sin errores, 4 pruebas unitarias, y en producción portada, búsqueda «sala cuna» (41 resultados, igual que en D1), fichas 9370-13 y 49-06, «Cómo funciona» y 404. La interfaz no cambió y no se repitió la revisión visual. Los temporizadores del VPS quedaron escritos, pero no instalados: la herramienta del agente no tuvo permiso para hacerlo.

## 2026-11-02 — Sitio público en Cloudflare con datos del Senado (commit de este avance)

Se publicó el sitio en Cloudflare Workers con SvelteKit, que reemplaza al frontend Angular como interfaz pública, y una base Cloudflare D1. El exportador lee la base de ingesta local, extrae de la respuesta original del Senado la urgencia, el número de ley, la fecha del Diario Oficial, el enlace al mensaje o moción, las materias y los autores, y genera una fila por boletín con sus trámites en JSON. Se exportaron 18.616 boletines en 51 segundos. En D1 quedaron 15.000, incluida toda la selección de género; los 3.616 más antiguos esperan el reinicio del límite diario de 100.000 filas escritas, porque cada boletín escribe unas 6. Durante la carga se encontraron títulos con saltos de línea y textos con «--», que wrangler interpreta como comentario; el exportador ahora escribe cada sentencia en una sola línea y parte esa secuencia. La fecha global del sitio se toma de la última ejecución exitosa y no de las fichas, porque la fecha de cada ficha solo avanza cuando cambia su contenido. Pruebas: 4 pruebas unitarias del formato y la búsqueda, revisión de tipos sin errores, recorrido de 12 rutas en local y 7 en producción, y revisión con Chromium sin interfaz a 375 y 1.280 px en modo claro y oscuro (sin desbordes, todos los campos con etiqueta, áreas táctiles de 44 px y foco visible). El temporizador de publicación diaria quedó escrito, pero no instalado.

## 2026-11-02 — Repositorio público iniciado en GitHub (commit de este avance)

Se creó `pedroaravenam/observatorio-legislacion-genero` como repositorio público y se subió `main` con el código, la licencia AGPL-3.0 y la documentación independiente. El sitio aún requiere exportar datos y adaptar el frontend antes de desplegarlo en Cloudflare Pages.

## 2026-11-02 — Alojamiento inicial en Cloudflare Pages (commit de este avance)

Se aclaró que Pages puede servir tanto el sitio como archivos JSON de consulta en la primera versión, sin VPS ni Google Drive. El frontend actual aún debe adaptarse a la exportación estática. Se registraron los límites de archivos y la necesidad de medir el volumen antes del despliegue.

## 2026-11-02 — Primer corte independiente (commit de este avance)

Se creó un repositorio independiente con código, pruebas y documentación técnica. Se mantuvo la atribución de las fuentes oficiales, se reunió la documentación técnica en un solo archivo y se adoptó AGPL-3.0 para el código. Se documentó una opción de publicación estática en Cloudflare Pages y una estimación inicial de capacidad, pendiente de medición real.
