# Estado del trabajo

## Resumen

Fecha: 2026-11-03. Último commit: clasificación automática de proyectos nuevos (este avance). **Publicado:** https://legislaciongenero.cl (la dirección sslip.io anterior redirige aquí).

El sitio está en línea con los 18.616 boletines del Senado (1990–2026): listado con búsqueda de texto completo, filtros por año, estado y origen, y ficha por boletín con su tramitación y enlaces a la ficha oficial del Senado, al texto del mensaje o moción y a la ley en la BCN. Por defecto muestra la selección de género (lista v5, 2.155 boletines; 2.154 cruzan con la base), presentada como criterio propio del Observatorio. «Cómo funciona» explica el criterio, los cinco pasos de selección con conteos en vivo, los temas, las fuentes y la actualización. «Panorama» (/panorama) muestra estados, mensajes frente a mociones, temas, temas por período, tiempo hasta ser ley y los 15 parlamentarios con más proyectos. La selección vive en la tabla `clasificacion_genero` del VPS y es el único universo del sitio (ya no hay opción «Todos»; un boletín fuera de ella responde 404). Los proyectos nuevos los decide cada noche un agente que aplica el criterio (`despliegue/clasificador/`), con su motivo y su nivel de relación con el género (alta, media o débil) visibles en la ficha; lo dudoso entra marcado como relación débil. La portada filtra por tema, cámara de origen y autor, ordena de cuatro maneras y descarga los resultados en CSV o JSON (`/datos/proyectos.csv` y `.json`, con los mismos filtros). Las pruebas con navegador (Chromium, Firefox y WebKit), axe y consistencia están en `sitio/pruebas/` y su informe en [docs/pruebas](docs/pruebas/2026-11-03-pruebas-del-sitio.md); los temas se asignan por el título con el léxico de `sitio/src/lib/temas.ts`.

Arquitectura vigente: todo en el VPS Hetzner compartido con Atendia, en el Compose `observatorio`. PostgreSQL de ingesta, ingesta .NET del Senado, exportador a SQLite (una transacción, ~2,5 min) y sitio SvelteKit con Node detrás del Caddy compartido. Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`, Compose `observatorio` (servicios `db` y `sitio` permanentes; `migraciones`, `ingesta` y `exportador` como trabajos).
- Máquina local: temporizadores del Senado desactivados el 2 de noviembre; ya no consulta ni publica.
- Base de ingesta: restaurada en el VPS desde la máquina local el 2 de noviembre (18.616 boletines, 18.627 respuestas originales).
- Programación: `observatorio-fecha` (09:00) y `observatorio-completa` (01:00), hora de Chile. Instaladas en el VPS el 2 de noviembre; primera carga completa el 3 de noviembre a la 01:00 y primera diaria a las 09:00.
- Dominio: `legislaciongenero.cl` (NIC Chile, vence el 03-11-2027), DNS en Cloudflare con proxy, SSL «Full (strict)», «Always Use HTTPS» y regla de caché que respeta el `max-age=300` del sitio. `www` y la dirección sslip.io redirigen con 301. Token de Cloudflare limitado a la zona en `~/.config/observatorio-genero/cloudflare.token` (estación local, no versionado).
- Clasificación: `despliegue/clasificador/clasificar.mjs` corre en la máquina de desarrollo con el CLI de Claude (sin herramientas). El 3 de noviembre clasificó los 109 pendientes: 97 decididos (9 incluidos) y 12 esperando el documento, que el Senado aún no publica. Medido contra la v5: coincide en 39 de 51, sin incluir ninguno de los 21 que la v5 excluía. Desde el 4 de noviembre corre dentro de las tareas de la noche (03:00), con Claude y Codex en paralelo sobre la lista original.
- Respaldo: `despliegue/respaldar-ingesta.sh` trae cada día un `pg_dump` del VPS a `~/respaldos/observatorio/` (7 diarios y 4 domingos). Primer respaldo y prueba de restauración el 3 de noviembre, con las cinco tablas comparadas iguales. Temporizador de usuario instalado el 3 de noviembre (próxima ejecución el 4 a las 06:01) y probado ejecutando el servicio por systemd.
- Alertas: correo por Resend desde `alertas@legislaciongenero.cl` (dominio verificado, DNS en Cloudflare). Configuración en `/opt/observatorio/alerta.conf` del VPS (600, fuera del repositorio). Unidades instaladas el 3 de noviembre: `OnFailure=` en la consulta diaria y la carga completa, y `observatorio-atraso.timer` (10:30, hora de Chile). Probadas con fallas provocadas.
- Primeras ejecuciones en el VPS (03-11): carga completa a las 01:00 sin trabajo pendiente (menos de 15 días desde la anterior) y consulta diaria a las 09:00 con 6 boletines nuevos (18.622).

## Próximo paso exacto

1. Publicar en el VPS la verificación por ficha (migración 0009). Primera corrida de las tareas de la noche: jueves 5 de noviembre a las 03:01 (temporizador `observatorio-noche`, ya instalado). Revisar el correo de resumen y `clasificar.mjs progreso`; cuando termine la pasada sobre la lista original, decidir qué hacer con lo que el agente sacaría.

## Pendientes priorizados

1. ~~Fecha de verificación por ficha~~ hecha el 4 de noviembre en el código (migración 0009); falta publicarla en el VPS.
2. Decidir por señal qué hacer con los falsos positivos de la lista v5, con el [informe del 4 de noviembre](docs/mediciones/revision-v5-2026-11-04.md) (el agente sacaría el 15 % de T1 hasta el 90 % de T4; revisiones hechas con un criterio anterior al vigente). La pasada nocturna termina la revisión con el criterio vigente; regenerar el informe con `clasificar.mjs informe-v5 --archivo`. No se ha aplicado ningún cambio.
3. Incorporar datos de la Cámara (autores con identificador y sexo, votaciones) y textos de la BCN.
4. Seguir el plan de cortes: fecha de verificación por ficha, v5, autores de la Cámara, resiliencia y textos de la BCN (CI ya instalada, falta confirmar su primera corrida en verde).
5. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos
- **Caída del servicio del Senado (4 de noviembre de 2026).** El servicio `wspublico/tramitacion.php` responde «No existe el número de boletín solicitado» a cualquier consulta, incluso de boletines que existen; los documentos y la ficha web del Senado siguen funcionando. La consulta diaria de las 09:02 falló (el aviso por correo llegó) y el sitio conserva los datos del 3 de noviembre. La ventana de la consulta diaria recupera hasta 14 días de atraso: si dura más, hará falta la carga completa. Si la caída continúa, la comprobación de datos al día avisará pasadas 36 horas.

- VPS compartido con RAM justa (swap en uso) y con la firma electrónica de Centro Alma. Redes y volúmenes separados.
- El Caddy es de la plataforma educativa: si esa plataforma recrea Caddy desde otra copia de su Compose, el observatorio pierde la red `observatorio-edge`.
- Las decisiones del agente son automáticas y nadie las revisa antes de publicarse. Dependen del CLI de Claude y de la sesión iniciada en la máquina de desarrollo; si esa máquina está apagada, los proyectos nuevos no aparecen hasta que vuelva (y a las 48 horas llega un aviso). Ocho de las nueve inclusiones iniciales salen de la regla de delitos sexuales de `criterio.md`, que el desarrollador puede cambiar.
- El único respaldo de la base de ingesta está en la máquina de desarrollo, con el disco al 91 %. Si se pierden el VPS y esa máquina a la vez, hay que volver a cargar todo desde el Senado.
- Si el propio VPS se cae, nadie avisa: las alertas corren en el VPS y no hay un monitor externo.
- La selección de género es automática y no está validada; el sitio lo declara en la portada, la ficha y «Cómo funciona».
- Los enlaces a documentos completos fallan cuando la fuente no responde; el sitio lo advierte en cada ficha.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Sitio](sitio/README.md)
- [Historial](docs/history/HISTORIAL.md)
