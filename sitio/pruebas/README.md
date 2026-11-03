# Pruebas del sitio con navegador

Guiones de Playwright para comprobar compatibilidad, accesibilidad y consistencia. Se usan **solo contra una copia local o un entorno de pruebas**, nunca contra producción.

## Preparación

```bash
cd sitio
npm install
npx playwright install chromium firefox webkit
npm run build
OBSERVATORIO_DB=/ruta/observatorio.db PORT=4173 HOST=127.0.0.1 ORIGIN=http://127.0.0.1:4173 \
  node --disable-warning=ExperimentalWarning build
```

## Guiones

| Comando                         | Qué hace                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run pruebas:navegadores`   | Rutas y funciones principales en Chromium, Firefox y WebKit a 375, 768 y 1280 px. Variables: `BASE`, `SALIDA`, `NAVEGADORES` (por ejemplo `chromium,firefox`) y `ANCHOS` |
| `npm run pruebas:accesibilidad` | axe-core (WCAG 2.1 A y AA) en claro y oscuro, más un recorrido solo con teclado                                                                                          |
| `npm run pruebas:consistencia`  | Compara cifras de la base con las del Panorama, la portada, las descargas y 30 fichas. Requiere `OBSERVATORIO_DB`                                                        |

Cada guion termina con código distinto de cero si algo falla y deja un JSON en `SALIDA` (por defecto `./pruebas-salida`, que no se versiona).

## WebKit en Fedora

El WebKit de Playwright necesita librerías de Ubuntu que Fedora no trae. Se corre en la imagen oficial, que se elimina al terminar:

```bash
docker run --rm --network host --ipc=host --security-opt label=disable \
  -v "$PWD":/app:ro -v /ruta/salida:/salida \
  -e BASE=http://127.0.0.1:4173 -e SALIDA=/salida/webkit -e NAVEGADORES=webkit \
  -w /app mcr.microsoft.com/playwright:v1.64.1-noble node pruebas/navegadores.mjs
```

En Fedora, `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` permite que Chromium y Firefox arranquen sin la validación de dependencias de Ubuntu.
