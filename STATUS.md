# Estado del trabajo

## Resumen

Fecha: 2026-11-03. Último avance: verificación por ficha, informe de la lista v5 y reevaluación al publicarse como ley (versión `0cf5927` en el VPS). **Publicado:** https://legislaciongenero.cl (la dirección sslip.io anterior redirige aquí).

El sitio está en línea con los 18.616 boletines del Senado (1990–2026): listado con búsqueda de texto completo, filtros por año, estado y origen, y ficha por boletín con su tramitación y enlaces a la ficha oficial del Senado, al texto del mensaje o moción y a la ley en la BCN. Por defecto muestra la selección de género (lista v5, 2.155 boletines; 2.154 cruzan con la base), presentada como criterio propio del Observatorio. «Cómo funciona» explica el criterio, los cinco pasos de selección con conteos en vivo, los temas, las fuentes y la actualización. «Panorama» (/panorama) muestra estados, mensajes frente a mociones, temas, temas por período, tiempo hasta ser ley y los 15 parlamentarios con más proyectos. La selección vive en la tabla `clasificacion_genero` del VPS y es el único universo del sitio (ya no hay opción «Todos»; un boletín fuera de ella responde 404). Los proyectos nuevos los decide cada noche un agente que aplica el criterio (`despliegue/clasificador/`), con su motivo y su nivel de relación con el género (alta, media o débil) visibles en la ficha; lo dudoso entra marcado como relación débil. La portada filtra por tema, cámara de origen y autor, ordena de cuatro maneras y descarga los resultados en CSV o JSON (`/datos/proyectos.csv` y `.json`, con los mismos filtros). Las pruebas con navegador (Chromium, Firefox y WebKit), axe y consistencia están en `sitio/pruebas/` y su informe en [docs/pruebas](docs/pruebas/2026-11-03-pruebas-del-sitio.md); los temas se asignan por el título con el léxico de `sitio/src/lib/temas.ts`.

Arquitectura vigente: todo en el VPS Hetzner compartido con Atendia, en el Compose `observatorio`. PostgreSQL de ingesta, ingesta .NET del Senado, exportador a SQLite (una transacción, ~2,5 min) y sitio SvelteKit con Node detrás del Caddy compartido. Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`, Compose `observatorio` (servicios `db` y `sitio` permanentes; `migraciones`, `ingesta` y `exportador` como trabajos).
- Máquina local: temporizadores del Senado desactivados el 2 de noviembre; ya no consulta ni publica.
- Base de ingesta: restaurada en el VPS desde la máquina local el 2 de noviembre (18.616 boletines, 18.627 respuestas originales).
- Programación: `observatorio-fecha` (09:00) y `observatorio-completa` (01:00), hora de Chile. Instaladas en el VPS el 2 de noviembre; primera carga completa el 3 de noviembre a la 01:00 y primera diaria a las 09:00. `observatorio-parlamentarios` (09:30) carga los diputados y enlaza el sexo de los autores; instalado en el VPS por el desarrollador el 5 de noviembre, primera ejecución el 6 de noviembre a las 09:32.
- Dominio: `legislaciongenero.cl` (NIC Chile, vence el 03-11-2027), DNS en Cloudflare con proxy, SSL «Full (strict)», «Always Use HTTPS» y regla de caché que respeta el `max-age=300` del sitio. `www` y la dirección sslip.io redirigen con 301. Token de Cloudflare limitado a la zona en `~/.config/observatorio-genero/cloudflare.token` (estación local, no versionado).
- Clasificación: `despliegue/clasificador/clasificar.mjs` corre en la máquina de desarrollo con el CLI de Claude (sin herramientas). El 3 de noviembre clasificó los 109 pendientes: 97 decididos (9 incluidos) y 12 esperando el documento, que el Senado aún no publica. Medido contra la v5: coincide en 39 de 51, sin incluir ninguno de los 21 que la v5 excluía. Desde el 4 de noviembre corre dentro de las tareas de la noche (03:00), con Claude y Codex en paralelo sobre la lista original.
- Respaldo: `despliegue/respaldar-ingesta.sh` trae cada día un `pg_dump` del VPS a `~/respaldos/observatorio/` (7 diarios y 4 domingos). Primer respaldo y prueba de restauración el 3 de noviembre, con las cinco tablas comparadas iguales. Temporizador de usuario instalado el 3 de noviembre (próxima ejecución el 4 a las 06:01) y probado ejecutando el servicio por systemd.
- Alertas: correo por Resend desde `alertas@legislaciongenero.cl` (dominio verificado, DNS en Cloudflare). Configuración en `/opt/observatorio/alerta.conf` del VPS (600, fuera del repositorio). Unidades instaladas el 3 de noviembre: `OnFailure=` en la consulta diaria y la carga completa, y `observatorio-atraso.timer` (10:30, hora de Chile). Probadas con fallas provocadas.
- Primeras ejecuciones en el VPS (03-11): carga completa a las 01:00 sin trabajo pendiente (menos de 15 días desde la anterior) y consulta diaria a las 09:00 con 6 boletines nuevos (18.622).

## Próximo paso exacto

1. **Reactivar el temporizador nocturno** (`systemctl --user enable --now observatorio-noche.timer`) cuando Codex recupere su cupo (hacia las 23:00 del 5 de noviembre). Está detenido desde el 5 de noviembre porque el criterio cambió a `agente-05f93dc5` (maternidad, pensiones, asignaciones a madres, gremios) y la pasada nocturna re-evaluaría ~730 decisiones del agente hechas con el criterio anterior (~730 llamadas). Antes conviene que pasen los 48 casos de control de cada agente (`clasificar.mjs probar`, ~100 llamadas).

## Pendientes priorizados

1. ~~Fecha de verificación por ficha~~ hecha y publicada el 4 de noviembre (migración 0009, versión `0cf5927`); las fechas parten de la cota del relleno y avanzan con cada consulta.
2. ~~Aplicar la revisión del agente a la selección~~ hecho el 5 de noviembre: la selección pasó de 2.170 a 1.547 proyectos tras validar 24 casos (ver `docs/history/HISTORIAL.md`). Quedan por definir cómo mejorar el criterio con los dos patrones que aparecieron (maternidad en el título; mejora de pensiones del pilar solidario) y el control semanal de exclusiones. Respaldo previo: `ingesta-20261105-1137.dump` en esta máquina.
3. Incorporar votaciones de la Cámara y textos de la BCN. El sexo de los autores ya está (4 de noviembre; 7 correcciones manuales por verificar en `datos/referencia/alias-autores.csv`).
4. Seguir el plan de cortes: fecha de verificación por ficha, v5, autores de la Cámara, resiliencia y textos de la BCN (CI ya instalada, falta confirmar su primera corrida en verde).
5. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos
- **Caída del servicio del Senado (desde el 4 de noviembre de 2026).** `wspublico/tramitacion.php` responde HTTP 200 con «No existe el número de boletín solicitado» **tras 30 segundos exactos**, para cualquier boletín y desde cualquier red; la web de tramitación, los documentos y senado.cl sí responden. La consulta diaria falla cada día (el correo de alerta llegó el 5 a las 10:30) y el sitio conserva los datos del 3 de noviembre. La carga completa corre sin trabajo pendiente y volverá a intentar sola hacia el 14 de noviembre (según la regla del código, sin comprobar), lo que cubriría cualquier hueco si el servicio vuelve. El monitor externo abrirá un aviso al pasar 72 horas. Alternativas, a decidir: esperar, avisar al Senado, o un lector de la ficha web como respaldo (más trabajo y sin revisar sus términos de uso).

- VPS compartido con RAM justa (swap en uso) y con la firma electrónica de Centro Alma. Redes y volúmenes separados.
- El Caddy es de la plataforma educativa: si esa plataforma recrea Caddy desde otra copia de su Compose, el observatorio pierde la red `observatorio-edge`.
- Las decisiones del agente son automáticas y nadie las revisa antes de publicarse. Dependen del CLI de Claude y de la sesión iniciada en la máquina de desarrollo; si esa máquina está apagada, los proyectos nuevos no aparecen hasta que vuelva (y a las 48 horas llega un aviso). Ocho de las nueve inclusiones iniciales salen de la regla de delitos sexuales de `criterio.md`, que el desarrollador puede cambiar.
- Hay una segunda copia cifrada de cada respaldo diario en el bucket privado `observatorio-respaldos` de Cloudflare R2 (30 días de retención), probada el 5 de noviembre. Depende de dos cosas que no están en el repositorio: la sesión de `wrangler` y `~/.config/observatorio-genero/respaldo.clave`, que debe guardarse también en el gestor de contraseñas. Si se pierde esa clave, las copias de R2 no se pueden leer. El disco de esta máquina bajó del 96 % al 82 % el 5 de noviembre, tras eliminar 328 volúmenes de pruebas de este proyecto.
- Si el propio VPS se cae, el monitor externo (`monitor.yml`, cada 30 minutos) abre un issue; GitHub lo avisa por correo a quien sigue el repositorio.
- La selección de género es automática y no está validada; el sitio lo declara en la portada, la ficha y «Cómo funciona».
- Los enlaces a documentos completos fallan cuando la fuente no responde; el sitio lo advierte en cada ficha.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Sitio](sitio/README.md)
- [Historial](docs/history/HISTORIAL.md)
