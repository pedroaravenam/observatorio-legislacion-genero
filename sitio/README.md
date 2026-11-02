# Sitio público

SvelteKit con `adapter-node`. Lee la base pública SQLite que genera [`../exportador`](../exportador) (ruta en la variable `OBSERVATORIO_DB`) con el módulo `node:sqlite`, en modo de solo lectura.

| Tarea | Comando |
|---|---|
| Instalar | `npm install` |
| Pruebas | `npm test` |
| Tipos | `npm run check` |
| Probar en local | `npm run build && OBSERVATORIO_DB=/ruta/observatorio.db npm run preview` |
| Imagen | `docker build -t observatorio-sitio sitio` (desde la raíz) |
| Publicar | `despliegue/subir-version.sh` (ver [alojamiento](../docs/alojamiento.md)) |

La base se abre en `src/lib/server/db.ts`. Los documentos completos no se copian: cada ficha enlaza al Senado y a la BCN.
