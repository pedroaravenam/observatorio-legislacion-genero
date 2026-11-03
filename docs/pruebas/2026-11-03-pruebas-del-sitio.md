# Pruebas del sitio: compatibilidad, accesibilidad y consistencia

Fecha: 2026-11-03. Versión del sitio probada: la del commit que incluye esta entrada, compilada y servida en local sobre una copia de la base pública del 2 de noviembre de 2026 (18.616 boletines, 2.154 en la selección de género).

Estas pruebas responden a lo que el TDR exige para el sitio (sección 3.8 y Producto 5): pruebas de compatibilidad, de accesibilidad técnica y consistencia verificable entre los datos y las visualizaciones. Los guiones están en `sitio/pruebas/` y se pueden repetir (ver `sitio/pruebas/README.md`).

## 1. Compatibilidad entre navegadores

Cada navegador recorre 8 rutas a tres anchos (375, 768 y 1280 px) y ejecuta las funciones principales, con 120 comprobaciones por navegador.

| Navegador | Versión | Comprobaciones | Fallas |
|---|---|---|---|
| Chromium | 156.0.8078.4 | 120 | 0 |
| Firefox | 157.0 | 120 | 0 |
| WebKit (motor de Safari) | 27.2 | 120 | 0 |

Qué se comprueba en cada ancho:

| Comprobación | Detalle |
|---|---|
| Rutas | Portada, filtro por autor, cámara y orden, búsqueda por pertinencia, Panorama, Cómo funciona, ficha y página de error: código HTTP esperado, contenido principal presente, sin desborde horizontal y sin errores en la consola |
| Filtro por tema | Se envía el formulario y el total baja |
| Campo de autor | Tiene su lista de nombres (724) |
| Búsqueda de palabras | Ordena por pertinencia y no arrastra un orden anterior |
| Ordenar | El botón conserva los filtros vigentes |
| Paginación | «Siguiente» muestra otros proyectos |
| Descarga | El CSV baja con nombre `proyectos-genero-AAAA-MM-DD.csv` y contenido |
| Gráfico anual y Panorama | Se dibujan (al menos 30 barras; al menos cinco bloques y dos tarjetas de origen) |

**Cómo se probó WebKit.** Fedora no trae las librerías que necesita el WebKit de Playwright, así que se corrió dentro de la imagen oficial `mcr.microsoft.com/playwright:v1.64.1-noble` con `--rm`. Es el motor de Safari, pero no es Safari: no cubre Safari en iOS ni en macOS reales.

## 2. Accesibilidad técnica

axe-core 4.14.0 con las reglas WCAG 2.0 y 2.1 de nivel A y AA, sobre las 8 rutas, en modo claro y oscuro, a 375 y 1280 px (32 combinaciones).

| Resultado | Cifra |
|---|---|
| Violaciones | 0 |
| Reglas cumplidas por página | entre 19 y 30 |

Recorrido solo con teclado:

| Paso | Resultado |
|---|---|
| Saltar al buscador con el enlace de salto (2 pulsaciones de Tab y Enter) | Pasa |
| Llegar al buscador con Tab | Pasa |
| Foco visible en el buscador (contorno de al menos 2 px) | Pasa |
| Buscar con Enter | Pasa |
| Abrir una ficha tabulando desde el buscador | Pasa |

axe detecta una parte de los problemas de accesibilidad, no todos. No sustituye una revisión con lector de pantalla, que no se hizo.

## 3. Consistencia entre la base y lo que muestra el sitio

Se calculó cada cifra con SQL directo sobre la base y se comparó con lo que muestra el sitio. Resultado: **257 comparaciones, 257 coinciden**.

| Grupo | Comparaciones | Qué se compara |
|---|---|---|
| Estados | 5 | Total, leyes, en tramitación y cerrados del Panorama, y las mismas cifras en el texto visible |
| Origen (Mensaje y Moción) | 6 | Total, leyes y mediana de días hasta ser ley |
| Cámaras | 2 | Proyectos por cámara de origen |
| Autores | 47 | Los 15 de la lista (proyectos, leyes y valor visible), que nadie fuera de la lista supere al último y el total de personas distintas |
| Períodos | 12 | Proyectos por período, leyes con plazo y mediana de días |
| Temas | 32 | Para cada uno de los 8 temas: el valor visible frente al del Panorama, la portada con `?tema=`, la descarga JSON y las leyes con `estado=Publicado` |
| Portada y descargas | 3 | Total de la selección, total de todos los proyectos y filas del CSV |
| Fichas | 150 | 30 boletines al azar (semilla fija) con título, estado, fecha de ingreso, número de ley y marca de selección |

Límites de esta prueba:

- Los temas se asignan con expresiones regulares en TypeScript, así que no se recalculan con SQL. Se comprobó que las cuatro vistas del mismo tema den el mismo número, pero no que la asignación sea la correcta; eso lo cubre la revisión del criterio.
- Se comparó contra la copia local de la base del 2 de noviembre, no contra la de producción, que desde entonces recibió boletines nuevos.

## 4. Fallas encontradas y corregidas

Las pruebas encontraron cinco problemas reales en el sitio, que se corrigieron antes de cerrar.

| Problema | Cómo apareció | Corrección |
|---|---|---|
| Una búsqueda de palabras salía ordenada por fecha | La URL traía `orden=recientes` porque el selector de orden, asociado al formulario principal, enviaba su valor | El orden tiene su propio formulario con los filtros vigentes; la búsqueda nueva ordena por pertinencia |
| Lo escrito antes de que cargara el JavaScript se borraba | WebKit: el buscador quedaba vacío tras escribir y enviar | `bind:value` en el buscador y el campo de autor; se verificó que «Quitar filtros» sigue vaciándolos |
| Cambiar el orden enviaba el formulario sin aviso | Dependía del JavaScript y no funcionaba antes de la carga; además incumple WCAG 3.2.2 | Botón «Ordenar» visible |
| 37 pausas de Tab antes del buscador | Recorrido con teclado | Enlace «Saltar al buscador» en la portada |
| Doble punto en el pie («a. m..») | Captura de pantalla | Se quitó el punto sobrante |

Además, en WebKit aparecieron avisos «Unable to preload CSS» en 7 y luego en 2 comprobaciones. Venían del guion, que pasaba a la ruta siguiente mientras la anterior seguía hidratando; con una espera a que cada página termine de cargar, tres corridas seguidas dieron 0 fallas. El sitio no cambió por esto.

## 5. Lo que no se probó

| Pendiente | Motivo |
|---|---|
| Producción con Playwright | La regla del proyecto limita Playwright a entornos locales o de prueba. Producción se verificó solo con solicitudes `curl` (códigos, tipo de contenido y totales de la descarga) |
| Safari real, iOS y Android reales | No hay dispositivos; WebKit y Chromium emulan el motor, no el dispositivo |
| Lector de pantalla | Sin pruebas con NVDA, VoiceOver ni TalkBack |
| Carga y rendimiento | Las pruebas de carga corresponden al Producto 4 y no se hicieron aquí |
| Seguridad básica | Fuera del alcance de estos guiones |
