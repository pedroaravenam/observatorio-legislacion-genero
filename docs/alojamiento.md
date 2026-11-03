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
| HTTPS | Cloudflare (proxy, SSL «Full (strict)», caché de 5 min) delante del Caddy compartido de la plataforma educativa | Bloques de `despliegue/Caddyfile.observatorio`; Caddy conectado a `observatorio-edge` y con certificado propio de Let's Encrypt |
| Documentos completos | No se copian | Se enlazan al Senado y a la BCN |

Dirección: https://legislaciongenero.cl. `www` y la dirección provisoria anterior (observatorio.116-203-181-6.sslip.io) redirigen con 301. `DOMINIO` en `/opt/observatorio/.env` fija el `ORIGIN` del sitio. El DNS está en Cloudflare; si se cambia el proxy, Caddy sigue renovando su certificado por HTTP-01 a través de Cloudflare.

## Por qué se dejó Cloudflare

El primer corte se publicó en Cloudflare Workers con D1. Se pasó al VPS el mismo día por tres razones:

- El plan gratuito de D1 permite 100.000 filas escritas al día y cada boletín escribe unas 6. La carga completa necesitaba dos días y había que enviar lotes de 150 sentencias con wrangler.
- La ingesta dependía de la máquina local. En el VPS, la ingesta, la base y el sitio quedan juntos.
- Con todo en el VPS, la exportación es una sola transacción local: 18.616 boletines en unos 2,5 minutos, medidos con el VPS ocupado por otra compilación.

El Worker `observatorio-legislacion-genero` y su base D1 se borraron de Cloudflare el 2 de noviembre.

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

## Alertas por correo

Qué avisa, y cuándo:

| Aviso | Cuándo se envía |
|---|---|
| Falló la consulta diaria o la carga completa | Cuando la unidad termina con error. Incluye las últimas 30 líneas del registro |
| Datos atrasados o sitio caído | Una comprobación diaria (10:30, hora de Chile) consulta `/estado.json` del sitio público. Avisa si no responde o si la última consulta exitosa al Senado tiene más de 36 horas, lo que también cubre un temporizador que no corrió |

Se envía como máximo un aviso por problema cada 20 horas. Si el propio VPS se cae, no hay quien avise: para eso haría falta un monitor externo, que hoy no existe.

Los correos salen por la API de Resend con una llave de solo envío, exclusiva de este proyecto. La llave y los correos van en `/opt/observatorio/alerta.conf` (permisos 600, fuera del repositorio; el modelo está en `despliegue/alerta.conf.ejemplo`).

Instalación, que se hace en el VPS con `ssh atendia-development`:

1. Dejar el archivo con la llave de Resend sin pegarla en ningún chat: se copia la llave en el panel y se ejecuta `ALERTA_PARA=correo@ejemplo.com despliegue/configurar-alertas.sh` en la máquina local. El script la toma del portapapeles, la guarda en el VPS con permisos 600, vacía el portapapeles y envía el correo de prueba del paso 2. Alternativa manual, desde el VPS: `sudo cp /opt/observatorio/alerta.conf.ejemplo /opt/observatorio/alerta.conf && sudo chmod 600 /opt/observatorio/alerta.conf && sudo nano /opt/observatorio/alerta.conf`.
2. Probar el envío: `sudo /opt/observatorio/alertar.sh prueba` debe dejar un correo en la bandeja.
3. Instalar las unidades: `sudo cp /opt/observatorio/systemd/observatorio-{alerta@.service,atraso.service,atraso.timer,fecha.service,completa.service} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now observatorio-atraso.timer`.
4. Probar el aviso de falla sin romper nada: `sudo systemctl start observatorio-alerta@observatorio-fecha.service`. Si ya llegó uno en las últimas 20 horas, se omite; para repetirlo se borra `/var/lib/observatorio-alertas`.

## Límites y riesgos

- El VPS es compartido y su RAM está justa: 2,2 GB disponibles en reposo, con swap en uso. Una compilación de la plataforma educativa llevó la carga a 8.
- El VPS guarda también la firma electrónica de Centro Alma (Atendia). El observatorio no comparte redes ni volúmenes con Atendia.
- **Disponibilidad de las fuentes**, medida desde la máquina local: 94,7 % en la Cámara, 93,6 % en el Senado y 81,8–98,8 % en la BCN. Afecta solo a los enlaces de documentos completos.
- **Lectura desde el navegador:** la Cámara permite CORS abierto; el Senado no envía cabeceras CORS y la BCN solo autoriza `bcn.cl`. Por eso el sitio no consulta las fuentes desde el navegador.
