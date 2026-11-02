# Alojamiento del Observatorio de Legislación de Género

## Tamaño conocido y estimación

La carpeta local de datos de referencia ocupa 15 MB al 2 de noviembre de 2026. La carga histórica del Senado recorre 18.622 boletines. No se ha medido todavía el tamaño de la base PostgreSQL resultante, así que la capacidad de producción es una estimación, no una medición.

Como presupuesto inicial, conviene prever **2–10 GB de datos y respuestas originales** durante el primer año, más espacio para índices, registros y al menos dos respaldos. Si se usa un VPS único, **40 GB SSD es un mínimo razonable y 80 GB da margen cómodo**. La cifra se debe revisar después de medir una carga completa con los textos de la BCN.

## Primera publicación propuesta

**Cloudflare Pages sí puede alojar la primera versión completa del sitio y los datos que consulta.** El proceso de ingesta exportará archivos JSON pequeños, divididos por año o grupo de boletines, y el despliegue publicará esos archivos junto con el frontend. La primera versión no requiere VPS, Google Drive ni R2 para responder consultas. Antes de publicar hay que medir la exportación y respetar los límites de Pages: 20.000 archivos y 25 MiB por archivo en el plan gratuito.

- **Sitio y datos publicados:** frontend estático, índices y fichas JSON en el mismo despliegue de Cloudflare Pages. Cada dato conserva su fuente y fecha de verificación. Si los textos completos o el historial hacen crecer demasiado los archivos, esa parte puede pasar a R2.
- **Actualización:** por ahora, los procesos de ingesta pueden ejecutarse en la máquina de desarrollo que ya permanece encendida y publicar nuevas versiones de los datos. Si esa máquina se apaga, el sitio sigue disponible con la última versión, pero no se actualiza.
- **API pública:** se puede agregar un Worker de Cloudflare que consulte datos preparados. Las cuotas, las claves y los planes pagos de una API alojada son decisiones separadas de la licencia del código.

Esta opción evita contratar un VPS antes de conocer el tamaño real y el tráfico. El frontend actual todavía consulta una API dinámica; para que esta propuesta funcione hay que construir el exportador de datos públicos, adaptar el frontend a esos archivos, automatizar la publicación y mostrar la fecha de actualización. Si después se necesita una base activa o ejecutar la ingesta fuera de la máquina local, un VPS con PostgreSQL y procesos programados es el paso más directo para reutilizar el backend actual.

## Elección de herramientas

El sitio actual usa Angular, pero la nueva interfaz se puede construir en SvelteKit con salida estática, que despliega en Pages. El proceso de ingesta actual usa .NET y PostgreSQL; no condiciona el diseño visual ni obliga a publicar una API .NET. Se conserva mientras resuelve la extracción y normalización, y se cambia solo si el nuevo flujo de datos lo justifica. Antes de migrar se verificará que la nueva implementación mantenga la procedencia, la actualización y la recuperación tras fallas.

Google Drive puede conservar respaldos descargables, pero no será el origen de cada consulta del sitio. Google advierte que los archivos con muchas vistas o descargas en poco tiempo pueden quedar bloqueados temporalmente.

Fuentes de límites: [Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/), [Google Drive](https://support.google.com/drive/answer/2423534?hl=es).

## Por comprobar

1. Medir el tamaño de PostgreSQL tras la carga completa y estimar el crecimiento semanal de respuestas crudas.
2. Exportar una muestra real y medir el tamaño de índices y fichas comprimidos.
3. Probar la construcción y publicación de un sitio estático sin depender de la API local.
4. Definir y probar respaldos de los datos originales y del modelo normalizado.
