# Estado del trabajo

## Resumen

Fecha: 2026-11-12. **Publicado:** https://legislaciongenero.cl (la dirección sslip.io anterior redirige aquí). La versión desplegada es la del commit del rediseño del 12 de noviembre (ver [el historial](docs/history/HISTORIAL.md)).

El sitio muestra la selección de género: **1.589 proyectos** de los 18.659 boletines del Senado (1990–2026), al 12 de noviembre. Tiene cinco secciones:

- **Inicio (`/`):** portada de contexto, un ensayo con cifras al margen (qué cuenta como legislación de género, cuánto se legisla, 16 leyes hito, quién presenta y qué prospera, temas, estado actual y quién hace el sitio). Los enlaces antiguos al buscador (`/?tema=…`) redirigen a `/proyectos`.
- **Panorama:** estados, gráfico anual, niveles de relación con el género, origen, autoría por sexo, temas por período, proyectos en tramitación (etapa y último trámite), tiempo hasta ser ley y los 15 parlamentarios con más proyectos.
- **Proyectos (`/proyectos`):** búsqueda de texto completo y filtros por tema, año, estado, origen, cámara de origen, autor y autoría según el sexo de quienes firman; descargas CSV y JSON con los mismos filtros. Cada ficha trae tramitación, autores con su reseña de la BCN, motivo y nivel de relación con el género, y enlaces a la ficha del Senado, al texto y a la ley.
- **Actualidad:** últimos trámites, proyectos recién ingresados y últimas leyes; avisa si el Senado lleva más de 72 horas sin entregar datos.
- **Cómo funciona:** criterio, fuentes, límites, autoría, contacto y apoyo.

Modo claro y oscuro con selector en la cabecera (por defecto sigue al sistema). La selección vive en la tabla `clasificacion_genero` del VPS y es el único universo del sitio; un boletín fuera de ella responde 404. Los datos de autoría, contacto y canales de aporte están en `sitio/src/lib/sitio.ts`.

Los proyectos nuevos los decide un agente que aplica `despliegue/clasificador/criterio.md`. El servicio de datos del Senado estuvo caído del 4 al 9 de noviembre y volvió el 10; la consulta diaria funciona desde entonces.

Arquitectura: todo en el VPS Hetzner compartido con Atendia, Compose `observatorio` (PostgreSQL de ingesta, ingesta .NET, exportador a SQLite y sitio SvelteKit con Node detrás del Caddy compartido). Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`. Las escrituras en la base de producción y la instalación de unidades las ejecuta el desarrollador (`! comando`).
- VPS, temporizadores: `observatorio-fecha` (09:00), `observatorio-completa` (01:00), `observatorio-parlamentarios` (09:30, instalado el 5 de noviembre, primera ejecución el 6 a las 09:32) y `observatorio-atraso` (10:30), hora de Chile. `OnFailure=` envía correo por Resend desde `alertas@legislaciongenero.cl`.
- Esta máquina, temporizadores de usuario: `observatorio-noche` (03:01: casos de control, proyectos nuevos, reevaluación; la pasada sobre la lista v5 solo con `REVISAR_V5=1`), `observatorio-respaldo` (06:03) y `observatorio-clasificar` (09:31). Siguen activos temporizadores de medición del proyecto anterior (disponibilidad, cobertura, cambio de Cámara y BCN, sondeo del VPS) y el ejecutor de CI del repositorio privado.
- Correo: Resend envía (alertas desde `alertas@legislaciongenero.cl`, por el subdominio `send`). La recepción de `contacto@legislaciongenero.cl` es Cloudflare Email Routing: MX `route1-3.mx.cloudflare.net` en el dominio raíz y una regla que reenvía a Gmail; funciona desde el 14 de noviembre de 2026. El token de la zona solo lee el estado del enrutamiento; para ver reglas o el registro de actividad hace falta otro.
- Respaldo: `despliegue/respaldar-ingesta.sh` trae cada día un `pg_dump` a `~/respaldos/observatorio/` (7 diarios y 4 domingos; exige 1,5 GB libres) y sube una copia **cifrada** al bucket privado `observatorio-respaldos` de Cloudflare R2 (30 días), con la sesión de `wrangler`. Último respaldo previo a cambios de selección: `ingesta-20261105-1137.dump`.
- Monitor externo: `.github/workflows/monitor.yml` (cada 30 minutos) abre un issue si el sitio no responde o los datos pasan de 72 horas.
- CI: `.github/workflows/ci.yml` en GitHub (.NET con PostgreSQL, sitio, exportador y clasificador).
- Dominio: `legislaciongenero.cl` (NIC Chile, vence el 03-11-2027), DNS en Cloudflare con proxy y SSL «Full (strict)». Token de Cloudflare limitado a la zona en `~/.config/observatorio-genero/cloudflare.token` (no versionado).
- Disco de esta máquina: 82 % tras eliminar el 5 de noviembre 328 volúmenes de pruebas de este proyecto.

## Próximo paso exacto

0. **Clasificación (12–13 de noviembre):** en producción desde el 13 de noviembre: validación manual de casos límite (migración `0011`), criterio `agente-9140a81f` («objeto primero» más las reglas del desarrollador; los delitos sexuales contra menores quedan fuera) y `observatorio-noche.timer` activo (solo Claude; cada noche repasa 50 decisiones con criterio anterior, primero las incluidas, más 15 al azar de la lista v5: 8 incluidas y 7 excluidas desde 2018). Validados con Claude 59 casos; el agente coincidió en 25 (42 %, criterio anterior sobre casos límite). Queda 1 pendiente (1120-13: el Senado no publica su texto). El sitio muestra 1.496 proyectos (eran 1.589 antes de la validación). Falta: ver el correo de la noche y validar la cola que aparezca (`clasificar.mjs cola`, `evidencia`, `resolver`); medir si los casos pendientes bajan (`acuerdo`); decidir si Sol sirve de segunda opinión; revisar el 14891-04, que fallan los tres modelos. Casos de control: 49 de 50 con Sonnet; Codex excluido.
1. Crear las cuentas de Mercado Pago, GitHub Sponsors y Ko-fi y poner sus direcciones en `sitio/src/lib/sitio.ts`; mientras estén vacías, el sitio dice que los canales se están habilitando.
2. Escribir la reseña del autor (`AUTOR.resena` en el mismo archivo) y revisar los nombres de las 16 leyes hito (`sitio/src/lib/server/contexto.ts`).
3. Mirar el correo de resumen de la noche del 6 de noviembre (casos de control y reevaluación con el criterio `agente-05f93dc5`), que quedó sin revisar.
4. Guardar `~/.config/observatorio-genero/respaldo.clave` en el gestor de contraseñas: sin ella las copias de R2 no se pueden leer.

## Pendientes priorizados

1. Definir el control semanal de exclusiones (unas 5 al azar) y qué hacer con los 26 de los 50 casos propuestos que no se validaron (`docs/mediciones/casos-a-validar-2026-11-05.md`).
2. Verificar con una fuente el sexo de los 7 autores corregidos a mano (`datos/referencia/alias-autores.csv`).
3. Decidir si se detienen los temporizadores de medición del proyecto anterior y el ejecutor de CI del repositorio privado.
4. Incorporar las votaciones de la Cámara y los textos de la BCN.
5. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos

- **El servicio de datos del Senado puede volver a caer.** Entre el 4 y el 9 de noviembre de 2026 `wspublico/tramitacion.php` respondió «No existe el número de boletín solicitado» tras 30 segundos; volvió el 10 sin aviso. Mientras falla, el sitio conserva los últimos datos, la alerta de atraso llega por correo y Actualidad lo avisa. No hay fuente de respaldo.
- El texto de la portada es interpretación del Observatorio sobre cifras calculadas; las pruebas de consistencia no cubren las cifras de la portada ni los bloques nuevos de Panorama (niveles, en tramitación, leyes por sexo de quienes firman).
- VPS compartido con RAM justa (swap en uso) y con la firma electrónica de Centro Alma. Redes y volúmenes separados. El Caddy es de la plataforma educativa: si la recrea desde otra copia de su Compose, el observatorio pierde la red `observatorio-edge`.
- Las decisiones del agente sobre proyectos nuevos son automáticas. El desarrollador validó 24 casos el 5 de noviembre y coincidió con el agente en las 24 exclusiones, pero eso no mide el acierto total y no hay revisión sistemática de lo nuevo. Dependen del CLI de Claude y de la sesión iniciada en esta máquina: si está apagada, no se clasifica (a las 48 horas llega un aviso). Codex quedó excluido el 13 de noviembre (sus errores salían con confianza alta).
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
