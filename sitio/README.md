# Sitio público

SvelteKit con salida a Cloudflare Workers. Lee los datos de Cloudflare D1 (vinculación `DB`), que se carga con los scripts de [`../exportador`](../exportador).

| Tarea | Comando |
|---|---|
| Instalar | `npm install` |
| Pruebas | `npm test` |
| Tipos | `npm run check` |
| Base local de pruebas | `npx wrangler d1 execute DB --local --file ../exportador/esquema-d1.sql` y luego los archivos exportados |
| Probar en local | `npm run build && npm run preview` (usa la base local) |
| Publicar | `npm run build && npx wrangler deploy` |

La base se lee desde `cloudflare:workers` (`src/lib/server/db.ts`). Los documentos completos no se copian: cada ficha enlaza al Senado y a la BCN.
