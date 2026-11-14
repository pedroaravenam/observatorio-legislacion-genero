# Alojamiento del Observatorio de Legislación de Género

## Arquitectura publicada (2 de noviembre de 2026)

Todo corre en un VPS Hetzner compartido (116.203.181.6, Ubuntu 26.04, 2 vCPU, 3,7 GB de RAM), en el proyecto Compose `observatorio` dentro de `/opt/observatorio`. El VPS también aloja Atendia y una plataforma educativa; cada proyecto tiene su Compose y sus redes.

| Pieza | Servicio | Detalle |
|---|---|---|
| Base de ingesta | `db` (PostgreSQL 17) | Respuestas originales del Senado y tablas normalizadas; volumen `observatorio_postgres`; red interna sin salida ni puertos publicados |
| Ingesta | `ingesta` (.NET, trabajo) | Consulta diaria por fecha (09:00) y carga completa reanudable (22:00), hora de Chile |
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

1. Dejar el archivo con la llave de Resend sin pegarla en ningún chat: se copia la llave en el panel y se ejecuta `ALERTA_PARA=correo@ejemplo.com despliegue/configurar-alertas.sh` en la máquina local. El script pide la llave por pantalla (oculta, en una terminal propia), la guarda en el VPS con permisos 600 y envía el correo de prueba del paso 2. Alternativa manual, desde el VPS: `sudo cp /opt/observatorio/alerta.conf.ejemplo /opt/observatorio/alerta.conf && sudo chmod 600 /opt/observatorio/alerta.conf && sudo nano /opt/observatorio/alerta.conf`.
2. Probar el envío: `sudo /opt/observatorio/alertar.sh prueba` debe dejar un correo en la bandeja.
3. Instalar las unidades: `sudo cp /opt/observatorio/systemd/observatorio-{alerta@.service,atraso.service,atraso.timer,fecha.service,completa.service} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now observatorio-atraso.timer`.
4. Probar el aviso de falla sin romper nada: `sudo systemctl start observatorio-alerta@observatorio-fecha.service`. Si ya llegó uno en las últimas 20 horas, se omite; para repetirlo se borra `/var/lib/observatorio-alertas`.

## Monitor externo y segunda copia del respaldo

**Monitor.** `.github/workflows/monitor.yml` corre cada 30 minutos en GitHub, fuera del VPS. `despliegue/monitor/comprobar.sh` pide la portada y `/estado.json` (tres intentos) y mira la antigüedad de la última consulta exitosa al Senado (umbral de 72 horas). Si el sitio no responde o los datos pasan el umbral, abre un issue con la etiqueta `monitor` (GitHub avisa por correo a quien sigue el repositorio) y lo cierra solo cuando todo vuelve. Complementa las alertas por correo del VPS, que no pueden avisar si el propio VPS cae.

**Segunda copia.** El respaldo diario (`respaldar-ingesta.sh`) queda en esta máquina y, si existe `~/.config/observatorio-genero/r2.conf`, `subir-respaldo-r2.sh` lo cifra con AES-256 (PBKDF2, clave en `respaldo.clave`), lo sube al bucket privado `observatorio-respaldos` de Cloudflare R2, lo vuelve a bajar y compara su SHA-256 antes de darlo por bueno. Una falla de esa subida hace fallar el respaldo y dispara el aviso por correo. Si faltan la configuración o la clave, la subida se omite. Desde el 5 de noviembre de 2026 usa el método `wrangler` (`R2_METODO=wrangler`): aprovecha la sesión iniciada de `wrangler` (cuenta de Cloudflare del desarrollador, fijado en la versión 4.158.0 vía `npx`), por lo que no guarda llaves; el método `s3` con llaves del bucket sigue disponible. `wrangler` sin `--remote` escribe en un R2 simulado en disco, así que el script exige `--remote` y comprueba en su salida que el recurso fue «remote». El bucket no tiene acceso público (`r2.dev` desactivado, sin dominios) y una regla de ciclo de vida borra los objetos a los 30 días. Si la sesión de `wrangler` caduca, la subida falla y llega el aviso; se renueva con `npx wrangler login`. La clave `respaldo.clave` es lo único que permite leer las copias: debe estar también en el gestor de contraseñas. Para recuperar: `despliegue/descargar-respaldo-r2.sh <objeto>.dump.enc <destino>.dump` y luego `pg_restore`. La cadena completa (subir, bajar, descifrar y comparar con el original) se probó con un respaldo real contra Cloudflare, y también bajo `systemd` con el temporizador diario.

El respaldo local también se niega a correr con menos de 1,5 GB libres en el disco y avisa por correo.

## Parlamentarios y sexo de los autores

El Senado entrega a cada autor como un nombre («Apellidos, Nombres»). El trabajo `trabajo.sh parlamentarios` (unidad `observatorio-parlamentarios`, 09:30 hora de Chile, después de la consulta diaria) hace cuatro cosas, en una sola ejecución de la imagen de ingesta:

1. Consulta `WSDiputado.retornarDiputados` de la Cámara y guarda la respuesta cruda. De ahí salen los diputados desde 1990 con su sexo (se lee el texto «Femenino»/«Masculino»; no se guardan RUT ni fecha de nacimiento).
2. Carga `datos/referencia/parlamentarios-bcn.csv` (1.820 reseñas parlamentarias de la BCN, con sexo derivado del texto de la reseña) y `datos/referencia/alias-autores.csv` (correcciones a mano, cada una con su nota). Ambos archivos van dentro de la imagen.
3. Extrae los nombres de autor de todas las fichas del Senado guardadas (`//autores/autor/PARLAMENTARIO`, unos 17 segundos) y los enlaza con una persona. El método queda en `autor_enlace.metodo`: `manual`, `camara_nombre`, `bcn_nombre`, `ambiguo_mismo_sexo` (varias personas con los mismos apellidos y nombre, todas del mismo sexo: se conserva el sexo sin atribuir la persona) o `sin_dato`. La regla exige apellidos idénticos y que el nombre sea uno de los nombres de pila; no hay coincidencias aproximadas.
4. Publica la base: el exportador calcula `proyecto.autoria` (`mujeres`, `hombres`, `mixta`, `ejecutivo` o `sin_dato`) y `proyecto.autores_detalle`.

Si un autor nuevo no se enlaza, aparece con método `sin_dato` y el proyecto sigue publicándose sin su sexo: `psql -c "SELECT texto FROM autor_enlace WHERE metodo = 'sin_dato'"` lista lo pendiente, y se resuelve agregando una fila a `alias-autores.csv` (con una nota de dónde se verificó). El trabajo se niega a borrar enlaces si no encuentra ningún autor en las fichas.

Instalación de las unidades en el VPS: `sudo cp /opt/observatorio/systemd/observatorio-parlamentarios.{service,timer} /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now observatorio-parlamentarios.timer`. Ejecución a mano: `sudo /opt/observatorio/trabajo.sh parlamentarios`.

## Clasificación automática de proyectos nuevos

La selección de género ya no es una lista fija dentro de la imagen del exportador: vive en la tabla `clasificacion_genero` de la base de ingesta (una fila por boletín, con la decisión, el grupo del criterio, la señal, quién decidió, la confianza y el motivo). La lista v5 se sembró una vez, con `clasificar.mjs sembrar`, y desde entonces cada proyecto nuevo lo decide un agente. El exportador lee esa tabla al publicar y el sitio solo muestra lo que está incluido.

| Elemento | Detalle |
|---|---|
| Programa | `despliegue/clasificador/clasificar.mjs`, que corre en la máquina de desarrollo con el CLI de Claude en modo sin interfaz (sin herramientas, sin sesión guardada y desde una carpeta vacía) |
| Criterio | `despliegue/clasificador/criterio.md`: el criterio de «Cómo funciona». Es la instrucción del agente y su versión (`agente-` más un resumen del texto) queda en cada decisión |
| Evidencia que recibe | Título, iniciativa, materias del Senado y, del PDF del proyecto, el número de términos del léxico de género, su densidad y hasta 12 fragmentos. El léxico es el de `sitio/src/lib/temas.ts` |
| Qué guarda | Decisión, grupo (`tema_central`, `componente` o `fuera`), confianza y un motivo de una o dos frases, que la ficha muestra |
| Cuándo | Dentro de las tareas de la noche (`observatorio-noche`, 03:00 hora de Chile, ver más abajo). Si hubo decisiones, publica el sitio con `trabajo.sh publicar` |
| Sin texto | Si el PDF aún no se puede leer, el proyecto espera hasta 14 días; después se decide solo con el título, con confianza máxima media |
| Falla o silencio | Correo por falla del programa, y la comprobación diaria del VPS avisa si pasan 48 horas sin una clasificación buena (marca `clasificacion-ok`) |

### Tareas de la noche

`despliegue/tareas-de-noche.sh` corre todos los días a las 03:00 (hora de Chile) con el temporizador de usuario `observatorio-noche`, para gastar los créditos de los agentes cuando nadie trabaja. Se instala copiando las unidades de `despliegue/local/` a `~/.config/systemd/user/` y activando `observatorio-noche.timer`. En orden:

| Paso | Qué hace |
|---|---|
| 1. Casos de control | Cada versión del criterio se prueba una sola vez por trabajador. Si uno acierta menos del 90 % no corre esa noche y llega un aviso |
| 2. Proyectos nuevos | Claude clasifica lo que ingresó y reclasifica lo que decidió con un criterio anterior |
| 3. Pasada sobre la lista original | **Solo Claude (sonnet).** Sigue hasta terminar o hasta agotar su límite de uso, y lo hecho queda guardado para la noche siguiente. Codex quedó excluido el 13 de noviembre de 2026 (ver HISTORIAL) |
| 4. Niveles y publicación | Los proyectos de la lista original que el agente mantiene reciben su nivel de relación con el género; si hubo cambios, se publica el sitio |
| 5. Resumen | Un correo con lo hecho, solo si hubo novedades |

Los dos trabajadores no se pisan: cada uno **reclama una tanda de 30 proyectos en la base** (tabla `revision_v5_reclamo`, con `FOR UPDATE SKIP LOCKED` y un reclamo que expira a los 30 minutos), así que nunca reciben el mismo proyecto y, si uno se detiene, lo que tenía reclamado vuelve a quedar disponible para el otro. Cada revisión guarda quién la hizo y con qué modelo (`revisor` y `modelo` en `revision_v5`).

Codex se lanza con `--ignore-user-config --ignore-rules`: la configuración personal de Codex tiene un hook que fallaba con un modelo no admitido por la cuenta ChatGPT. El modelo se fija en el script porque el rol `ligero` de OMP alterna entre modelos de distintos proveedores en cada consulta; se cambia con `CODEX_MODELO=openai-codex/<modelo>:<esfuerzo>`.

Desde el 5 de noviembre de 2026 esta pasada solo corre si se la pide con `REVISAR_V5=1`: la revisión ya se aceptó y se aplicó, y cada cambio de criterio la repetiría entera. La pasada **no cambia quién está en la selección**: deja su opinión en `revision_v5`, y `clasificar.mjs progreso` muestra cuánto se lleva y cuántos sacaría el agente. Aplicar esas salidas es una decisión pendiente. Para ensayar la lógica sin gastar créditos: `SOLO=ninguno despliegue/tareas-de-noche.sh`. Para pararlo: `systemctl --user disable --now observatorio-noche.timer`.

Casos de control: `clasificar.mjs probar` prueba al agente contra `despliegue/clasificador/casos-control.json` (cada caso con la respuesta que decidió el desarrollador) y debe repetirse cada vez que cambie `criterio.md`. `clasificar.mjs pendientes --reclasificar` repasa las decisiones que el propio agente tomó con una versión anterior del criterio (la pasada nocturna, en tandas de 50, primero las incluidas). **Validación manual:** los casos límite quedan en `validacion_genero` y no se publican hasta que el desarrollador los valide (`clasificar.mjs cola` / `resolver`; `acuerdo` mide la coincidencia con el agente).

Medir al agente: `node --disable-warning=ExperimentalWarning despliegue/clasificador/clasificar.mjs validar --n 60` lo compara contra la lista v5 en una muestra y no escribe nada en la base. Debe repetirse cada vez que cambie `criterio.md` o el modelo (`CLASIFICADOR_MODELO`).

Límites: las decisiones son automáticas y ninguna persona las revisa antes de publicarse, tal como pidió el desarrollador; la ficha lo dice. El agente depende del CLI de Claude y de la sesión iniciada en la máquina de desarrollo. Si esa máquina está apagada, los proyectos nuevos no aparecen hasta que vuelva. Corregir una decisión es un `UPDATE` sobre `clasificacion_genero` seguido de `trabajo.sh publicar`; la próxima corrida no la pisa, porque solo clasifica lo que no tiene fila.

## Respaldo de la base de ingesta

La base de ingesta (PostgreSQL del VPS: boletines, respuestas originales del Senado y su historial) se respalda cada día en la máquina de desarrollo. El VPS no guarda credenciales de esa máquina: ella se conecta por SSH, hace `pg_dump` en formato personalizado, trae el archivo y comprueba con SHA-256 que llegó completo. El sitio público no necesita respaldo porque se reconstruye desde esta base con el exportador.

| Elemento | Detalle |
|---|---|
| Script | `despliegue/respaldar-ingesta.sh`, con temporizador de usuario `observatorio-respaldo` (06:00, hora de Chile) |
| Destino | `~/respaldos/observatorio/ingesta-AAAAMMDD-HHMM.dump` (unos 28 MB), con su `.sha256` y permisos 600 |
| Retención | Los últimos 7 días y los domingos de las últimas 4 semanas. Siempre se conserva el más reciente |
| Falla | El VPS envía un correo con las últimas líneas del registro |
| Respaldo que no llega | El VPS marca cada respaldo bueno y su comprobación diaria avisa si pasan 48 horas sin marca, lo que cubre que la máquina esté apagada o que el temporizador no corra |

Instalación del temporizador, en la máquina de desarrollo:

```
mkdir -p ~/.config/systemd/user && cp ~/Desarrollo/observatorio-legislativo-abierto/despliegue/local/observatorio-respaldo.{service,timer} ~/.config/systemd/user/ && systemctl --user daemon-reload && systemctl --user enable --now observatorio-respaldo.timer && systemctl --user list-timers observatorio-respaldo.timer --no-pager
```

Prueba de restauración: `despliegue/probar-respaldo.sh` restaura el último respaldo en un contenedor PostgreSQL desechable y compara el número de filas de cinco tablas con las del VPS. El 3 de noviembre dio las cinco iguales. Se debe repetir después de cualquier cambio en el esquema y, como mínimo, una vez al mes.

Recuperación ante una pérdida del VPS, que **no se ha ensayado sobre el servidor real**: levantar el servicio `db` del Compose, copiar el último `.dump` al VPS y restaurarlo con `pg_restore -U observatorio -d observatorio --no-owner --clean --if-exists`; después correr `trabajo.sh publicar` para regenerar la base pública del sitio.

Límites: esta máquina es hoy el único destino. Si se pierden el VPS y esta máquina a la vez, quedaría solo volver a pedir todo al Senado, que son horas de carga y se pierde el historial de cambios. El disco de esta máquina está al 91 %, por lo que la retención es corta a propósito.

## Límites y riesgos

- El VPS es compartido y su RAM está justa: 2,2 GB disponibles en reposo, con swap en uso. Una compilación de la plataforma educativa llevó la carga a 8.
- El VPS guarda también la firma electrónica de Centro Alma (Atendia). El observatorio no comparte redes ni volúmenes con Atendia.
- **Disponibilidad de las fuentes**, medida desde la máquina local: 94,7 % en la Cámara, 93,6 % en el Senado y 81,8–98,8 % en la BCN. Afecta solo a los enlaces de documentos completos.
- **Lectura desde el navegador:** la Cámara permite CORS abierto; el Senado no envía cabeceras CORS y la BCN solo autoriza `bcn.cl`. Por eso el sitio no consulta las fuentes desde el navegador.
