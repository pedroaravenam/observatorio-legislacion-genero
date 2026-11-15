# Aplicación del pulido aprobado

15 de noviembre de 2026. El desarrollador aprobó la propuesta completa basada en el sitio original y pidió aplicarla. Las maquetas A/B abreviadas quedan descartadas.

## Cambios

- Apertura de Inicio en dos columnas en escritorio y una en móvil, con todo su contenido e índice.
- Interlineado y espacios de lectura, cronología completa más aireada y márgenes discretos.
- Títulos completos en Actualidad; pasos de las fichas legibles en móvil.
- Tablas de metodología desplazables, con sus cabeceras y regiones enfocables para desplazarlas con teclado.
- Acción Svelte `animarGraficos`: anima las barras originales, una vez por gráfico y navegación; las verticales desde su base y las horizontales desde la izquierda. Conserva cifras, colores, geometría final, hover, foco y enlaces.
- El cursor o foco detienen la animación del gráfico consultado. Se cancelan animaciones y observadores al navegar o desmontar, y se responde a cambios de movimiento reducido.
- Sin librerías nuevas, controles de maqueta ni cambios de texto, selección, consultas o base de datos.

## Verificación local

Solo Chromium sin interfaz y datos sintéticos en localhost; no se probó visualmente producción.

| Comprobación | Resultado |
|---|---|
| Svelte y TypeScript | Cero errores y cero advertencias. |
| Pruebas unitarias | 16 de 16 pasan. |
| Compilación | `npm run build` completado. |
| Contenido | Las 58 vistas conservan el hash del texto normalizado del original local. Incluye 16 hitos íntegros. |
| Geometría | 48 vistas: seis páginas, 390/768/1280/1440 px, claro/oscuro, sin desbordes. |
| Accesibilidad automática | 24 análisis axe WCAG 2.1 A/AA, sin infracciones. |
| Movimiento real | Se midió escala vertical intermedia 0,612542; las horizontales se observaron en navegación interna. La comprobación aislada midió escala horizontal 0,554095. |
| Interacción | Hover y foco muestran las magnitudes originales y detienen el dibujo. El gráfico no repite la entrada al volver a subir. Los enlaces por año y por hito funcionan. |
| Preferencia de movimiento | Al activarla se detienen las animaciones de barras. |
| Formularios | Filtro por tema y búsqueda sin JavaScript correctos; estados vacío y 404 conservados. |
| Tablas | Desplazamiento con flecha derecha y cabeceras visibles en móvil. |
| Revisión visual | Hoja de las seis páginas en escritorio y ficha móvil oscura; capturas de las seis páginas en móvil/escritorio, claro/oscuro. |

El detector de Impeccable conserva una advertencia estética sobre un borde de Panorama, ya presente en el diseño original. No representa una infracción de accesibilidad ni justifica cambiar la propuesta aprobada.

La primera medición de movimiento horizontal llegó después de terminar la animación; se comprobó por separado y se ajustó el guion para registrar su creación sin depender de un instante exacto. El resultado final de las interacciones es correcto, sin excepciones de página.

## Calidad de interfaz

- **Etiquetas y opcionalidad:** no se agregan campos ni formularios; se conservan sus etiquetas y ayudas originales.
- **Controles:** se conservan búsqueda y selectores nativos, sin pedir formatos escritos de fecha u hora.
- **Validación y confirmación:** se conservan errores del buscador y conteos de resultados. No hay un guardado nuevo que confirmar.
- **Estados:** se conservan carga, vacío, error y paginación deshabilitada; se verificaron vacío y 404.
- **Móvil:** sin desbordes; títulos y etapas completos. Tablas utilizables con teclado. El teclado virtual requiere prueba en un teléfono real.
- **Accesibilidad:** foco visible y regiones etiquetadas; axe sin infracciones, barras sin movimiento con preferencia reducida y contenido completo sin JavaScript. Pendiente lector de pantalla real.

Capturas, datos sintéticos y guiones de verificación en `/tmp/observatorio-pulido-aplicado/`, sin versionarlos.

## Publicación

Se desplegó **f12e2bd** mediante `despliegue/subir-version.sh`, después de la [CI en verde](https://github.com/pedroaravenam/observatorio-legislacion-genero/actions/runs/43679977004). El contenedor `observatorio-sitio-1` ejecuta `observatorio-sitio:f12e2bd` y quedó sano; PostgreSQL continuó sano.

Comprobación HTTP pública, sin navegador:

- Inicio, Panorama, Proyectos, Actualidad, Cómo funciona y la ficha 11077-07 responden 200.
- El texto normalizado de la portada es idéntico al guardado antes del despliegue; conserva sus 16 hitos.
- Cómo funciona entrega las tres tablas desplazables desde el servidor.
- `/estado.json` no cambió: 18.666 boletines, 1.467 seleccionados y última consulta `2026-11-14T13:08:38Z`.
- No se ejecutó ingesta, migración ni reexportación; no se escribieron datos en producción. Los datos sintéticos permanecen solo en las pruebas locales y no se subieron al servidor.

La comprobación HTTP con Python recibió 403; la comprobación normal con curl, que ya había respondido antes del despliegue, completó correctamente las seis rutas y la comparación. No se simuló un navegador ni se hizo revisión visual de producción.

El cierre posterior solo actualiza documentación. La versión funcional publicada sigue siendo f12e2bd: no hay cambios adicionales en el código de la aplicación. Evidencia temporal en `/tmp/observatorio-pulido-aplicado/publicacion.json` y `despliegue.log`.
