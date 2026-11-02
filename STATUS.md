# Estado del trabajo

## Resumen

Fecha: 2026-11-02. Último commit: sitio, ingesta y base movidos a un VPS (este avance). **Publicado:** https://observatorio.116-203-181-6.sslip.io (dirección provisoria, sin dominio propio).

El sitio está en línea con los 18.616 boletines del Senado (1990–2026): listado con búsqueda de texto completo, filtros por año, estado y origen, y ficha por boletín con su tramitación y enlaces a la ficha oficial del Senado, al texto del mensaje o moción y a la ley en la BCN. Por defecto muestra la selección de género preliminar (lista v5, 2.155 boletines; 2.154 cruzan con la base), con aviso explícito de que no está validada.

Arquitectura vigente: todo en el VPS Hetzner compartido con Atendia, en el Compose `observatorio`. PostgreSQL de ingesta, ingesta .NET del Senado, exportador a SQLite (una transacción, ~2,5 min) y sitio SvelteKit con Node detrás del Caddy compartido. Detalle en [docs/alojamiento.md](docs/alojamiento.md).

## Entorno

- VPS: `atendia-development` (116.203.181.6), `/opt/observatorio`, Compose `observatorio` (servicios `db` y `sitio` permanentes; `migraciones`, `ingesta` y `exportador` como trabajos).
- Máquina local: temporizadores del Senado desactivados el 2 de noviembre; ya no consulta ni publica.
- Base de ingesta: restaurada en el VPS desde la máquina local el 2 de noviembre (18.616 boletines, 18.627 respuestas originales).
- Programación: `observatorio-fecha` (09:00) y `observatorio-completa` (01:00), hora de Chile. Instaladas en el VPS el 2 de noviembre; primera carga completa el 3 de noviembre a la 01:00 y primera diaria a las 09:00.
- Cloudflare: el Worker y la base D1 del primer corte se borraron el 2 de noviembre.

## Próximo paso exacto

1. Verificar las primeras ejecuciones en el VPS (`journalctl -u observatorio-completa -u observatorio-fecha`) y que la fecha del pie del sitio avance.
2. Comprar el dominio, apuntarlo al VPS y agregar su bloque en el Caddyfile.

## Pendientes priorizados

1. Verificar la primera ejecución de los temporizadores del VPS.
2. Dominio propio.
3. Respaldo periódico de la base de ingesta fuera del VPS.
4. Corregir en la ingesta que la fecha de cada ficha solo avanza cuando cambia su contenido; hoy el sitio muestra la fecha global de la última consulta exitosa.
5. Validar manualmente la selección de género y publicar sus reglas en detalle.
6. Incorporar datos de la Cámara (autores con identificador, votaciones) y textos de la BCN.
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
