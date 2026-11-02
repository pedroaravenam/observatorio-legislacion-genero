# Alojamiento del Observatorio de Legislación de Género

## Tamaño conocido y estimación

La carpeta local de datos de referencia ocupa 15 MB al 2 de noviembre de 2026. La carga histórica del Senado recorre 18.622 boletines. No se ha medido todavía el tamaño de la base PostgreSQL resultante, así que la capacidad de producción es una estimación, no una medición.

Como presupuesto inicial, conviene prever **2–10 GB de datos y respuestas originales** durante el primer año, más espacio para índices, registros y al menos dos respaldos. Si se usa un VPS único, **40 GB SSD es un mínimo razonable y 80 GB da margen cómodo**. La cifra se debe revisar después de medir una carga completa con los textos de la BCN.

## Primera publicación propuesta

- **Sitio:** frontend estático en Cloudflare Pages. El contenido visual y las consultas públicas no requieren que un servidor procese cada visita.
- **Datos publicados:** índices compactos y fichas generadas por la ingesta, almacenados como archivos; los archivos grandes pueden ir a R2. La información incluye su fuente y fecha de verificación.
- **Actualización:** por ahora, los procesos de ingesta pueden ejecutarse en la máquina de desarrollo que ya permanece encendida y publicar nuevas versiones de los datos. Si esa máquina se apaga, el sitio sigue disponible con la última versión, pero no se actualiza.
- **API pública:** se puede agregar un Worker de Cloudflare que consulte datos preparados. Las cuotas, las claves y los planes pagos de una API alojada son decisiones separadas de la licencia del código.

Esta opción evita contratar un VPS antes de conocer el tamaño real y el tráfico. Requiere construir un exportador de datos públicos, una publicación automática y un control de frescura. Si después se necesita una base activa o ejecutar la ingesta fuera de la máquina local, un VPS con PostgreSQL y procesos programados es el paso más directo para reutilizar el backend actual.

## Elección de herramientas

El sitio actual usa Angular, pero la nueva interfaz se puede construir en SvelteKit con salida estática, que despliega en Pages. El proceso de ingesta actual usa .NET y PostgreSQL; no condiciona el diseño visual ni obliga a publicar una API .NET. Se conserva mientras resuelve la extracción y normalización, y se cambia solo si el nuevo flujo de datos lo justifica. Antes de migrar se verificará que la nueva implementación mantenga la procedencia, la actualización y la recuperación tras fallas.

## Por comprobar

1. Medir el tamaño de PostgreSQL tras la carga completa y estimar el crecimiento semanal de respuestas crudas.
2. Exportar una muestra real y medir el tamaño de índices y fichas comprimidos.
3. Probar la construcción y publicación de un sitio estático sin depender de la API local.
4. Definir y probar respaldos de los datos originales y del modelo normalizado.
