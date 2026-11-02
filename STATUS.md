# Estado del trabajo

## Resumen

Fecha: 2026-11-02. Último commit: sitio público en Cloudflare (este avance). **Publicado:** https://observatorio-legislacion-genero.pedrosko-aravena.workers.dev

El sitio está en línea con datos reales del Senado: listado con búsqueda de texto completo, filtros por año, estado y origen, ficha por boletín con su tramitación y enlaces a la ficha oficial del Senado, al texto del mensaje o moción y a la ley en la BCN. Por defecto muestra la selección de género preliminar (lista v5, 2.155 boletines; 2.154 cruzan con la base), con aviso explícito de que no está validada.

Arquitectura vigente: la ingesta .NET + PostgreSQL sigue en la máquina local con sus temporizadores. Un exportador convierte la base en sentencias para Cloudflare D1, con una fila por boletín y los trámites en JSON. El sitio es SvelteKit sobre Cloudflare Workers y lee D1. Los documentos completos no se copian: se enlazan a la fuente.

Mediciones del 2 de noviembre: base local completa 227 MB con respuestas crudas; 18.616 boletines y 199.853 trámites; exportación 59 MB de SQL; D1 remota 44,5 MB con 15.000 boletines. Cada boletín escribe unas 6 filas en D1. Las fuentes medidas tuvieron 94,7 % (Cámara), 93,6 % (Senado) y 81,8–98,8 % (BCN) de disponibilidad desde esta máquina.

## Entorno

- Sitio: Cloudflare Workers `observatorio-legislacion-genero` (subdominio `workers.dev`, sin dominio propio todavía).
- Datos: Cloudflare D1 `observatorio-legislacion-genero` (región ENAM), plan gratuito: 500 MB por base y 100.000 filas escritas al día.
- Ingesta: base PostgreSQL persistente en `~/.local/share/observatorio-genero/postgres`, alimentada por los temporizadores `observatorio-senado-fecha` (09:00) y `observatorio-senado-completa` (cada 15 días, 01:00).
- Publicación: `exportador/publicar.py`; temporizador diario `observatorio-publicar` (10:30), **pendiente de instalar** con `exportador/instalar-publicacion.sh`.

## Próximo paso exacto

1. Después de las 21:00 (reinicio del contador de D1 a las 00:00 UTC) cargar los 3.616 boletines antiguos que faltan: `python3 -I exportador/publicar.py --faltantes`.
2. Instalar el temporizador: `exportador/instalar-publicacion.sh 2026-11-02T20:30:00+00:00`.
3. Comprar el dominio y asociarlo al Worker.

## Pendientes priorizados

1. Cargar los boletines faltantes (1990–1996 aprox., números 2 a 4035).
2. Instalar el temporizador de publicación diaria y verificar su primera ejecución.
3. Dominio propio.
4. Corregir en la ingesta que la fecha de cada ficha solo avanza cuando cambia su contenido; hoy el sitio muestra la fecha global de la última consulta exitosa y, por ficha, la del último cambio registrado.
5. Validar manualmente la selección de género y publicar sus reglas en detalle.
6. Incorporar datos de la Cámara (autores con identificador, votaciones) y textos de la BCN.
7. CI del repositorio (pruebas del sitio y del exportador).
8. Revisar los términos de reutilización de datos de las tres fuentes.

## Riesgos activos

- La actualización depende de que esta máquina esté encendida; si se apaga, el sitio sigue en línea con el último dato publicado.
- Una carga completa que cambie más de ~16.000 boletines en un día excedería el límite gratuito de D1; `publicar.py` corta en 14.000 y continúa en la siguiente ejecución.
- La selección de género es automática y no está validada; el sitio lo declara en la portada, la ficha y «Cómo funciona».
- Enlaces a documentos completos fallan cuando la fuente no responde; el sitio lo advierte en cada ficha.

## Enlaces

- [Plan](PLAN.md)
- [Documentación técnica](docs/documentacion-tecnica.md)
- [Alojamiento](docs/alojamiento.md)
- [Sitio](sitio/README.md)
- [Historial](docs/history/HISTORIAL.md)
