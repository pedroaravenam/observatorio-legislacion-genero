# Plan del primer lanzamiento

Fecha de inicio: 2 de noviembre de 2026.

## Objetivo

Publicar una herramienta gratuita e independiente que permita seguir proyectos de ley relacionados con género en Chile y verificar cada dato en su fuente oficial.

## Alcance del MVP

| Área | Incluye | Criterio de salida |
|---|---|---|
| Cámara | Proyectos, título, ingreso y autores disponibles | Una segunda carga no duplica registros; cada dato enlaza al origen |
| Senado | Estado y trámites del boletín | La ficha muestra la fecha de verificación y conserva el último dato válido ante fallas |
| Selección | Lista inicial de candidatos y reglas públicas | Cada inclusión tiene motivo y permite revisión; no se atribuye una clasificación definitiva a la fuente |
| Consulta | Índice, filtro por boletín y texto, ficha | Funciona en móvil y escritorio; estados de carga, vacío y error |
| Operación | Carga programada, registro de fallas y respaldo | Se comprueba recuperación desde un respaldo y se retiran contenedores tras las pruebas |
| Publicación | Sitio gratuito, nombre e identidad propios | Dominio, fuentes y responsable visibles; sin marca institucional ajena |

## Tramos estimados

1. **Semana 1:** proyecto separado, revisión de materiales publicables, estructura técnica, criterios de selección y diseño de la primera pantalla.
2. **Semanas 2–4:** ingesta y consultas de Cámara y Senado, sitio de proyectos y fichas, pruebas con datos reales.
3. **Semanas 5–7:** criterio de género revisable, información de frescura, despliegue y accesibilidad.
4. **Semanas 8–10:** integración inicial de textos de la BCN, mejora de búsqueda, respaldo, monitoreo y correcciones de uso real.

Las semanas suponen dedicación cercana a tiempo completo de una persona con apoyo de IA. La fecha de publicación se fija al comprobar los criterios de salida, no antes.

## Decisiones pendientes

- Dominio público.
- Definir las condiciones de uso de una eventual API alojada, separadas de la licencia AGPL-3.0 del código.
- Alcance inicial de la selección de género y quién revisa casos dudosos.
- Medir el volumen de la base completa y validar el alojamiento propuesto en [docs/alojamiento.md](docs/alojamiento.md).
- Revisión de cualquier acuerdo o encargo previo antes de reutilizar materiales del proyecto anterior.

## Primer avance concreto

Crear un corte vertical independiente: obtener proyectos desde una fuente oficial, guardarlos con procedencia y fecha, exponer una consulta y mostrar una lista pública. La revisión de la selección temática viene después de demostrar ese recorrido.
