# Historial

## 2026-11-03 — Descarga, orden y filtros por autor y cámara (commit de este avance)

Primer corte de la brecha de interfaz frente al TDR (secciones 3.7 y 3.8). La portada ahora filtra por cámara de origen y por autor, con una lista de 724 nombres escritos como «Apellidos, Nombre»; ordena por pertinencia, más recientes, más antiguos o con movimiento reciente; y descarga los resultados en CSV o JSON (`/datos/proyectos.csv` y `/datos/proyectos.json`) respetando los filtros y sin paginar. La lista y la descarga comparten `construirConsulta`, así que no pueden diverger. Los autores del Panorama y de la ficha enlazan a `/?autor=`, y cada bloque del Panorama muestra la fuente y la fecha de los datos. «Cómo funciona» explica la descarga. Verificación con Playwright en 375 y 1280 px, claro y oscuro: sin desbordes, campos con etiqueta y áreas táctiles de 44 px; el CSV y el JSON tienen exactamente las filas que muestra la página en cinco combinaciones de filtros. Un nombre de autor que no está en la lista aplica el filtro (sin resultados) y avisa junto al campo. Se corrigió además un doble punto en el pie. Queda el corte 2: compatibilidad entre navegadores, accesibilidad con axe y consistencia entre datos y gráficos.

## 2026-11-03 — Dominio legislaciongenero.cl con Cloudflare (commit de este avance)

Se delegó `legislaciongenero.cl` a Cloudflare. Con un token limitado a la zona se crearon los registros `A @` (116.203.181.6) y `CNAME www`, SSL «Full (strict)», «Always Use HTTPS» y una regla de caché para GET que respeta las cabeceras del sitio (`max-age=300`; se comprobó MISS y luego HIT). En el Caddy compartido se agregaron los bloques del dominio con respaldo `Caddyfile.bak-20261103T122049Z-observatorio`; primero se obtuvo el certificado de Let's Encrypt con el DNS sin proxy y después se activó el proxy. `www` y la dirección sslip.io redirigen con 301. `DOMINIO` del `.env` del VPS pasó a `legislaciongenero.cl`. La plataforma educativa y la agenda de Centro Alma siguen respondiendo. Primeras ejecuciones programadas en el VPS: carga completa sin trabajo pendiente y consulta diaria con 6 boletines nuevos.

## 2026-11-02 — Metodología, textos y panel «Panorama» (commit de este avance)

«Cómo funciona» se reescribió: criterio en tres grupos (tema central, componente, fuera), neutralidad de postura, cinco pasos de selección con conteos desde la base, temas, fuentes, actualización y límites. Se quitó «preliminar» de todo el sitio y se reescribieron los textos de portada, ficha, pie y errores con frases completas. Nueva página /panorama con estados, mensajes frente a mociones (88 % y 8 % llegan a ley), temas, temas por período, mediana de tiempo hasta ser ley y autores. Nuevo filtro por tema (función SQLite `tiene_tema`). Revisión con Playwright headless en 6 rutas, 375 y 1280 px, claro y oscuro: sin desbordes, campos etiquetados, áreas táctiles ≥44 px.

## 2026-11-02 — Rediseño del sitio (commit de este avance)

Se rediseñó la interfaz para que sea más seria, moderna e informativa, con identidad de género. Los colores son el violeta y el verde del movimiento feminista: el verde marca lo que llegó a ser ley y el violeta lo que sigue en tramitación. Las tipografías son Newsreader para títulos y nombres de proyectos y Public Sans para la interfaz, incluidas en el sitio sin depender de Google Fonts. La portada abre con una franja violeta y un gráfico de los proyectos de la selección por año (1990–2026), con la parte que hoy es ley en verde; cada barra filtra por su año y se anuncia a los lectores de pantalla. El listado pasó a filas con una barra de color según el estado, que siempre va acompañada del texto. La ficha muestra el avance en cinco pasos del proceso legislativo, deducido del estado y la etapa del Senado (con una prueba unitaria nueva), y en escritorio se ordena en dos columnas: la tramitación agrupada por año y, al lado, los datos, los autores y las materias. Revisión con Chromium sin interfaz a 375 y 1.280 px, en modo claro y oscuro, sobre 6 rutas: sin desbordes, todos los campos con etiqueta, áreas táctiles de 44 px o más y foco visible. Tipos sin errores y 5 pruebas unitarias.

## 2026-11-02 — Ingesta local desactivada (commit de este avance)

El desarrollador desactivó en la máquina local `observatorio-senado-fecha.timer` y `observatorio-senado-completa.timer`. Desde ahora, solo el VPS consulta al Senado.

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
