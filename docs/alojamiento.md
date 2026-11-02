# Alojamiento del Observatorio de Legislación de Género

## Arquitectura publicada (2 de noviembre de 2026)

Todo corre en un VPS Hetzner compartido (116.203.181.6, Ubuntu 26.04, 2 vCPU, 3,7 GB de RAM), en el proyecto Compose `observatorio` dentro de `/opt/observatorio`. El VPS también aloja Atendia y una plataforma educativa; cada proyecto tiene su Compose y sus redes.

| Pieza | Servicio | Detalle |
|---|---|---|
| Base de ingesta | `db` (PostgreSQL 17) | Respuestas originales del Senado y tablas normalizadas; volumen `observatorio_postgres`; red interna sin salida ni puertos publicados |
| Ingesta | `ingesta` (.NET, trabajo) | Consulta diaria por fecha (09:00) y carga completa reanudable (01:00), hora de Chile |
| Base pública | Archivo SQLite en el volumen `observatorio_publico` | Una fila por boletín, trámites en JSON, búsqueda FTS5 |
| Exportador | `exportador` (trabajo) | Reescribe la base pública completa en una transacción después de cada ingesta |
| Sitio | `sitio` (SvelteKit con Node) | Lee la base pública en solo lectura; red `observatorio-edge` |
| HTTPS | Caddy compartido de la plataforma educativa | Bloque `observatorio.116-203-181-6.sslip.io`; Caddy conectado a `observatorio-edge` |
| Documentos completos | No se copian | Se enlazan al Senado y a la BCN |

Dirección provisoria: https://observatorio.116-203-181-6.sslip.io. Con dominio propio se agrega un bloque en el Caddyfile y se cambia `DOMINIO` en `/opt/observatorio/.env`.

## Por qué se dejó Cloudflare

El primer corte se publicó en Cloudflare Workers con D1. Se pasó al VPS el mismo día por tres razones:

- El plan gratuito de D1 permite 100.000 filas escritas al día y cada boletín escribe unas 6. La carga completa necesitaba dos días y había que enviar lotes de 150 sentencias con wrangler.
- La ingesta dependía de la máquina local. En el VPS, la ingesta, la base y el sitio quedan juntos.
- Con todo en el VPS, la exportación es una sola transacción local: 18.616 boletines en unos 2,5 minutos, medidos con el VPS ocupado por otra compilación.

El Worker `observatorio-legislacion-genero` y la base D1 siguen existiendo en Cloudflare con 15.000 boletines sin actualizar, hasta que se decida retirarlos.

## Tamaño medido

| Qué | Tamaño |
|---|---|
| Base de ingesta (respaldo `pg_dump -Fc`) | 30 MB comprimido; 227 MB en disco |
| Base pública SQLite (18.616 boletines, índices y búsqueda) | 56 MB |
| Imágenes: sitio / exportador / ingesta | 173 / 463 / 234 MB |
| Memoria máxima asignada: db / sitio / ingesta / exportador | 768 / 256 / 512 / 512 MB |

## Operación

| Tarea | Cómo |
|---|---|
| Publicar una versión nueva | `despliegue/subir-version.sh`: construye las tres imágenes del commit en la máquina local, las sube una por una, copia Compose, trabajos y migraciones, y reinicia el sitio |
| Ejecutar un trabajo a mano | `sudo /opt/observatorio/trabajo.sh fecha`, `completa` o `publicar` |
| Programación | `despliegue/systemd/observatorio-{fecha,completa}.{service,timer}`, instaladas en `/etc/systemd/system/` |
| Secretos | `/opt/observatorio/.env` (root, 600): contraseña de PostgreSQL generada en el VPS, `VERSION` y `DOMINIO`. No se versiona |

Caddy pertenece a la plataforma educativa (`/opt/plataforma-educativa/app/`). Para el observatorio se agregó un bloque al `Caddyfile` y la red externa `observatorio-edge` en `compose.production.yaml`, con respaldos `*.bak-<fecha>-observatorio`. Si esa plataforma recrea Caddy desde otra copia de su Compose, hay que volver a agregar la red.

Las imágenes se suben por separado porque `podman save` con varias imágenes generó un archivo en que las tres etiquetas apuntaban a la misma imagen.

## Límites y riesgos

- El VPS es compartido y su RAM está justa: 2,2 GB disponibles en reposo, con swap en uso. Una compilación de la plataforma educativa llevó la carga a 8.
- El VPS guarda también la firma electrónica de Centro Alma (Atendia). El observatorio no comparte redes ni volúmenes con Atendia.
- **Disponibilidad de las fuentes**, medida desde la máquina local: 94,7 % en la Cámara, 93,6 % en el Senado y 81,8–98,8 % en la BCN. Afecta solo a los enlaces de documentos completos.
- **Lectura desde el navegador:** la Cámara permite CORS abierto; el Senado no envía cabeceras CORS y la BCN solo autoriza `bcn.cl`. Por eso el sitio no consulta las fuentes desde el navegador.
