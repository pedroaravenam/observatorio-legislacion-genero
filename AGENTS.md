# Observatorio de Legislación de Género (repositorio público)

Herramienta pública, gratuita e independiente para seguir los proyectos de ley sobre género en Chile: https://legislaciongenero.cl. Código con licencia AGPL-3.0. Desarrollador a cargo: Pedro Aravena.

Instrucciones para cualquier agente (Claude Code, Codex, OMP, opencode, Gemini). `CLAUDE.md` solo importa este archivo. Las reglas globales de `~/.codex/AGENTS.md` aplican aquí: cierre de avance (STATUS + HISTORIAL, commit y push directo a `main`, CI en verde, publicar), estructura documental, calidad de interfaz y revisión visual solo con Playwright sin interfaz.

**Esta es la carpeta de trabajo.** El proyecto con la Cámara y la CAF (`~/Desarrollo/observatorio-genero`, repositorio privado) se abandonó: no se usa ni se toma como fuente de instrucciones.

## Antes de empezar

1. Leer `STATUS.md`: dónde está el proyecto, riesgos y próximo paso.
2. Leer las últimas entradas de `docs/history/HISTORIAL.md` (buscar con `grep`, no leerlo completo).
3. Operación del VPS, respaldos, monitor y alertas: `docs/alojamiento.md`.

## Cómo trabajamos

- Todo en español de Chile: código de dominio, documentos, commits y mensajes. Hablar claro; si algo no se midió, decirlo.
- **Medir antes de afirmar.** No comparar grupos distintos de proyectos como si fueran lo mismo ni dar por demostrado lo que es una sospecha.
- El desarrollador decide el criterio de selección. El agente propone y prueba; los cambios a la selección visible se aplican solo con su visto bueno.

## Reglas que costaron caro

- **Límite de uso de los agentes.** Claude y Codex comparten cupo con la sesión interactiva. Antes de lanzar cualquier proceso con más de unas decenas de llamadas, decir cuántas son y el costo de referencia, y esperar aprobación. Todo proceso debe frenar al primer aviso de límite y poder reanudarse.
- **Editar `despliegue/clasificador/criterio.md`** cambia su versión: la pasada nocturna vuelve a evaluar cientos de decisiones y a correr los casos de control. Antes, `systemctl --user disable --now observatorio-noche.timer`; después, `enable --now`.
- **Producción.** El VPS `atendia-development` es compartido. Las escrituras en la base de producción y la instalación de unidades de `systemd` las ejecuta el desarrollador con `! comando`: se prepara el comando con ensayo en seco (por defecto) y se prueba antes en una copia desechable restaurada de `~/respaldos/observatorio/` (ver `aplicar-v5` en `clasificar.mjs`). Tomar un respaldo fresco antes (`despliegue/respaldar-ingesta.sh`).
- **Contenedores de prueba:** eliminar con `rm -fv` (los volúmenes anónimos se acumulan y llenan el disco). No usar `prune` en Podman: borra también volúmenes con nombre de otros proyectos.
- **`wrangler`:** los comandos de objetos de R2 necesitan `--remote`; sin él escriben en un R2 simulado en disco y parecen funcionar.
- **Servicio del Senado:** cuando falla, `wspublico/tramitacion.php` tarda 30 segundos en responder. Al sondearlo, esperar al menos 60.
- No simular un navegador para saltar protecciones de un sitio (`camara.cl` rechaza las consultas automatizadas).
- **Secretos:** nunca imprimirlos (`~/.config/observatorio-genero/respaldo.clave`, tokens, llaves). Se piden por pantalla en la terminal del desarrollador.
- **Consumo de contexto:** las respuestas de las fuentes son grandes; guardar en archivo e imprimir solo un resumen.

## Pruebas

- No hay `dotnet` en esta máquina. `despliegue/local/probar-dotnet.sh` aplica las migraciones y corre toda la suite .NET contra PostgreSQL en contenedores desechables; la CI hace lo mismo.
- Sitio: `cd sitio && npm run check && npm test`; pruebas con navegador en `sitio/pruebas/` (solo contra una copia local).
- Clasificador: `node --test despliegue/clasificador/lib.test.mjs`.

## Publicar

`despliegue/subir-version.sh` construye las imágenes del commit actual, las sube al VPS y reinicia el sitio; después `sudo /opt/observatorio/trabajo.sh publicar` en el VPS reescribe la base pública. «Publicado» significa en el VPS con la CI de `main` en verde.
