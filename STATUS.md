# Estado del trabajo

## Resumen

Fecha: 2026-11-05. **Publicado:** https://legislaciongenero.cl (la dirección sslip.io anterior redirige aquí). Última versión desplegada en el VPS: `19389e4`. Los cambios posteriores son scripts de esta máquina, el criterio del agente (`agente-05f93dc5`) y documentos; el sitio no cambió desde entonces.

El sitio muestra la selección de género: **1.547 proyectos** de los 18.622 boletines del Senado (1990–2026). El 5 de noviembre se aceptó la revisión del agente sobre la lista v5 y la selección pasó de 2.170 a 1.547 (ver [el historial](docs/history/HISTORIAL.md) y [la lista de lo retirado](docs/mediciones/exclusiones-v5-aplicadas-2026-11-05.csv)). El listado tiene búsqueda de texto completo y filtros por tema, año, estado, origen, cámara de origen, autor y **autoría según el sexo de quienes firman**; cada ficha trae su tramitación, el sexo de los autores con enlace a su reseña de la BCN, el motivo y el nivel de relación con el género (alta, media o débil), y enlaces a la ficha del Senado, al texto y a la ley. «Panorama» muestra estados, origen, autoría por sexo, temas por período, tiempo hasta ser ley y los 15 parlamentarios con más proyectos. Las descargas CSV y JSON respetan los mismos filtros. La selección vive en la tabla `clasificacion_genero` del VPS y es el único universo del sitio; un boletín fuera de ella responde 404.

Los proyectos nuevos los decide un agente que aplica `despliegue/clasificador/criterio.md`. **El servicio de datos del Senado está caído desde el 4 de noviembre** (ver Riesgos): el sitio conserva los datos del 3 de noviembre y no entran proyectos nuevos.

Arquitectura: todo en el VPS Hetzner compartido con Atendia, Compose `observatorio` (PostgreSQL de ingesta, ingesta .NET, exportador a SQLite y sitio SvelteKit con Node detrás del Caddy compartido). Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`. Las escrituras en la base de producción y la instalación de unidades las ejecuta el desarrollador (`! comando`).
- VPS, temporizadores: `observatorio-fecha` (09:00), `observatorio-completa` (01:00), `observatorio-parlamentarios` (09:30, instalado el 5 de noviembre, primera ejecución el 6 a las 09:32) y `observatorio-atraso` (10:30), hora de Chile. `OnFailure=` envía correo por Resend desde `alertas@legislaciongenero.cl`.
- Esta máquina, temporizadores de usuario: `observatorio-noche` (03:01: casos de control, proyectos nuevos, reevaluación; la pasada sobre la lista v5 solo con `REVISAR_V5=1`), `observatorio-respaldo` (06:03) y `observatorio-clasificar` (09:31). Siguen activos temporizadores de medición del proyecto anterior (disponibilidad, cobertura, cambio de Cámara y BCN, sondeo del VPS) y el ejecutor de CI del repositorio privado.
- Respaldo: `despliegue/respaldar-ingesta.sh` trae cada día un `pg_dump` a `~/respaldos/observatorio/` (7 diarios y 4 domingos; exige 1,5 GB libres) y sube una copia **cifrada** al bucket privado `observatorio-respaldos` de Cloudflare R2 (30 días), con la sesión de `wrangler`. Último respaldo previo a cambios de selección: `ingesta-20261105-1137.dump`.
- Monitor externo: `.github/workflows/monitor.yml` (cada 30 minutos) abre un issue si el sitio no responde o los datos pasan de 72 horas.
- CI: `.github/workflows/ci.yml` en GitHub (.NET con PostgreSQL, sitio, exportador y clasificador).
- Dominio: `legislaciongenero.cl` (NIC Chile, vence el 03-11-2027), DNS en Cloudflare con proxy y SSL «Full (strict)». Token de Cloudflare limitado a la zona en `~/.config/observatorio-genero/cloudflare.token` (no versionado).
- Disco de esta máquina: 82 % tras eliminar el 5 de noviembre 328 volúmenes de pruebas de este proyecto.

## Próximo paso exacto

1. Mirar el correo de resumen de la noche del 6 de noviembre: casos de control con Claude y Codex (48 cada uno) y reevaluación de unas 731 decisiones del agente con el criterio `agente-05f93dc5`. Comprobar si volvieron proyectos a la selección.
2. Guardar `~/.config/observatorio-genero/respaldo.clave` en el gestor de contraseñas: sin ella las copias de R2 no se pueden leer.
3. Esperar al Senado. Si el servicio no vuelve, decidir qué hacer (ver Riesgos).

## Pendientes priorizados

1. Definir el control semanal de exclusiones (unas 5 al azar) y qué hacer con los 26 de los 50 casos propuestos que no se validaron (`docs/mediciones/casos-a-validar-2026-11-05.md`).
2. Verificar con una fuente el sexo de los 7 autores corregidos a mano (`datos/referencia/alias-autores.csv`).
3. Decidir si se detienen los temporizadores de medición del proyecto anterior y el ejecutor de CI del repositorio privado.
4. Incorporar las votaciones de la Cámara y los textos de la BCN.
5. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos

- **Servicio de datos del Senado caído (desde el 4 de noviembre de 2026).** `wspublico/tramitacion.php` responde HTTP 200 con «No existe el número de boletín solicitado» **tras 30 segundos exactos**, para cualquier boletín (se probaron siete que ya estaban cargados) y desde esta máquina y el VPS. La web de tramitación, los documentos y senado.cl sí responden. La consulta diaria falla cada día y el sitio conserva los datos del 3 de noviembre. La carga completa volverá a intentarlo sola hacia el 14 de noviembre (según la regla del código, sin comprobar). Alternativas, a decidir: esperar, avisar al Senado, o un lector de la ficha web como respaldo (más trabajo y sin revisar sus términos de uso).
- VPS compartido con RAM justa (swap en uso) y con la firma electrónica de Centro Alma. Redes y volúmenes separados. El Caddy es de la plataforma educativa: si la recrea desde otra copia de su Compose, el observatorio pierde la red `observatorio-edge`.
- Las decisiones del agente sobre proyectos nuevos son automáticas. El desarrollador validó 24 casos el 5 de noviembre y coincidió con el agente en las 24 exclusiones, pero eso no mide el acierto total y no hay revisión sistemática de lo nuevo. Dependen de los CLI de Claude y de Codex y de la sesión iniciada en esta máquina: si está apagada, no se clasifica (a las 48 horas llega un aviso). Codex agotó su cupo el 5 de noviembre.
- Cambiar `criterio.md` cambia su versión y hace que la pasada nocturna vuelva a evaluar cientos de decisiones (llamadas con costo): hay que detener `observatorio-noche.timer` antes de editarlo.
- La copia de R2 depende de la sesión de `wrangler` (si caduca, el respaldo avisa por correo) y de la clave `respaldo.clave`.
- El sexo de senadores y de quienes la Cámara no informa es un dato derivado de la BCN o corregido a mano; el sitio lo declara en «Cómo funciona».
- Los enlaces a documentos completos fallan cuando la fuente no responde; el sitio lo advierte en cada ficha.

## Enlaces

- [Plan](PLAN.md)
- [Instrucciones para agentes](AGENTS.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento y operación](docs/alojamiento.md)
- [Sitio](sitio/README.md)
- [Historial](docs/history/HISTORIAL.md)
- [Revisión de la lista v5, 5 de noviembre](docs/mediciones/revision-v5-2026-11-05.md)
