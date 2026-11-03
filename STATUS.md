# Estado del trabajo

## Resumen

Fecha: 2026-11-03. Último commit: descarga, orden y filtros por autor y cámara (este avance). **Publicado:** https://legislaciongenero.cl (la dirección sslip.io anterior redirige aquí).

El sitio está en línea con los 18.616 boletines del Senado (1990–2026): listado con búsqueda de texto completo, filtros por año, estado y origen, y ficha por boletín con su tramitación y enlaces a la ficha oficial del Senado, al texto del mensaje o moción y a la ley en la BCN. Por defecto muestra la selección de género (lista v5, 2.155 boletines; 2.154 cruzan con la base), presentada como criterio propio del Observatorio. «Cómo funciona» explica el criterio, los cinco pasos de selección con conteos en vivo, los temas, las fuentes y la actualización. «Panorama» (/panorama) muestra estados, mensajes frente a mociones, temas, temas por período, tiempo hasta ser ley y los 15 parlamentarios con más proyectos. La portada filtra por tema, cámara de origen y autor, ordena de cuatro maneras y descarga los resultados en CSV o JSON (`/datos/proyectos.csv` y `.json`, con los mismos filtros); los temas se asignan por el título con el léxico de `sitio/src/lib/temas.ts`.

Arquitectura vigente: todo en el VPS Hetzner compartido con Atendia, en el Compose `observatorio`. PostgreSQL de ingesta, ingesta .NET del Senado, exportador a SQLite (una transacción, ~2,5 min) y sitio SvelteKit con Node detrás del Caddy compartido. Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`, Compose `observatorio` (servicios `db` y `sitio` permanentes; `migraciones`, `ingesta` y `exportador` como trabajos).
- Máquina local: temporizadores del Senado desactivados el 2 de noviembre; ya no consulta ni publica.
- Base de ingesta: restaurada en el VPS desde la máquina local el 2 de noviembre (18.616 boletines, 18.627 respuestas originales).
- Programación: `observatorio-fecha` (09:00) y `observatorio-completa` (01:00), hora de Chile. Instaladas en el VPS el 2 de noviembre; primera carga completa el 3 de noviembre a la 01:00 y primera diaria a las 09:00.
- Dominio: `legislaciongenero.cl` (NIC Chile, vence el 03-11-2027), DNS en Cloudflare con proxy, SSL «Full (strict)», «Always Use HTTPS» y regla de caché que respeta el `max-age=300` del sitio. `www` y la dirección sslip.io redirigen con 301. Token de Cloudflare limitado a la zona en `~/.config/observatorio-genero/cloudflare.token` (estación local, no versionado).
- Primeras ejecuciones en el VPS (03-11): carga completa a las 01:00 sin trabajo pendiente (menos de 15 días desde la anterior) y consulta diaria a las 09:00 con 6 boletines nuevos (18.622).

## Próximo paso exacto

1. Respaldo periódico de la base de ingesta fuera del VPS.
2. Volver a aplicar el criterio de selección a los boletines nuevos.

## Pendientes priorizados

1. Alerta cuando falle una ejecución programada.
2. Pruebas con evidencia del sitio (corte 2 del TDR): compatibilidad en Firefox y WebKit, accesibilidad con axe y consistencia entre datos y gráficos.
3. Respaldo periódico de la base de ingesta fuera del VPS.
4. Corregir en la ingesta que la fecha de cada ficha solo avanza cuando cambia su contenido; hoy el sitio muestra la fecha global de la última consulta exitosa.
5. Volver a aplicar el criterio a los proyectos ingresados después del 22-10-2026 (hoy solo aparecen en «Todos») y validar casos dudosos.
6. Incorporar datos de la Cámara (autores con identificador y sexo, votaciones) y textos de la BCN.
7. CI del repositorio (pruebas del sitio y del exportador).
8. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos

- VPS compartido con RAM justa (swap en uso) y con la firma electrónica de Centro Alma. Redes y volúmenes separados.
- El Caddy es de la plataforma educativa: si esa plataforma recrea Caddy desde otra copia de su Compose, el observatorio pierde la red `observatorio-edge`.
- No hay respaldo de la base de ingesta fuera del VPS, salvo la copia local del 2 de noviembre.
- La selección de género es automática y no está validada; el sitio lo declara en la portada, la ficha y «Cómo funciona».
- Los enlaces a documentos completos fallan cuando la fuente no responde; el sitio lo advierte en cada ficha.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Sitio](sitio/README.md)
- [Historial](docs/history/HISTORIAL.md)
