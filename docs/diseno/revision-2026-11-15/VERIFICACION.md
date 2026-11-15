# Verificación de la revisión

15 de noviembre de 2026. Chromium headless, con datos sintéticos y sin solicitudes a terceros durante el recorrido del sitio.

## Sitio actual, base d9a30fc

| Comprobación | Alcance | Resultado |
|---|---|---|
| Respuesta y geometría | Ocho rutas × cuatro anchos × dos temas | 64 recorridos: 200 en siete rutas y 404 esperado en la octava; cero desbordes horizontales y cero excepciones de página. |
| Accesibilidad automática | Ocho rutas × 390/1440 px × dos temas | 32 análisis axe WCAG 2.1 A/AA, sin infracciones automáticas. |
| Resultado móvil | Proyectos a 390 px | Encabezado de resultados a 1.440 px desde el inicio del documento. |
| Enlaces del gráfico anual | Panorama a 390 px | 37 enlaces, ancho individual medido de 7,6875 px. Es un problema de comodidad de selección; no se declara infracción WCAG sin evaluar sus excepciones. |
| Pasos de ficha publicada | Ficha a 390 px | Los cinco nombres de paso tienen `display:none`; no queda nombre de etapa visible. |
| Detector de Impeccable | Código Svelte, ejecutado por evaluación B | Dos advertencias estéticas de bordes; ninguna constituye por sí sola una falla de accesibilidad. |

La composición se inspeccionó en hojas de capturas de las seis páginas principales en escritorio y móvil. No se presume que los títulos sintéticos cubran el peor caso de largo de texto de producción. Tampoco se verificó un lector de pantalla, teclado virtual o dispositivo táctil real.

## Maqueta autónoma

| Comprobación | Alcance | Resultado |
|---|---|---|
| Geometría | Seis pantallas y portada B × cuatro anchos | 28 vistas sin desborde horizontal. |
| Accesibilidad automática | Seis pantallas de la variante A × 390/1440 px, claro | 12 análisis axe sin infracciones tras corregir el nombre accesible del gráfico de la maqueta. |
| Tema oscuro | Portada B en cuatro anchos | Capturas tomadas; inspección visual de móvil. No se ejecutó axe sobre toda la maqueta oscura. |
| Movimiento reducido | Panorama en cuatro anchos | Cero animaciones activas tras pedir repetir la entrada con `prefers-reduced-motion: reduce`. |
| Búsqueda | Mensaje de demostración | El formulario indica que no está conectado; no se presenta una búsqueda ni guardado ficticios como exitosos. |
| Revisión visual | Hojas de escritorio de las seis pantallas; portada B escritorio y móvil oscuro; Proyectos móvil | Composición revisada. La maqueta es parcial: falta implementar y verificar los flujos reales antes de publicar el sitio. |

El prototipo incorpora las fuentes Newsreader y Public Sans bajo SIL OFL 1.1; sus licencias están incluidas al final del HTML. No instala paquetes ni consulta fuentes externas.

## Archivos temporales

`/tmp/observatorio-diseno-20261115/` conserva auditoría JSON, verificación de maqueta, guiones, base sintética y capturas. No se versionan imágenes ni bases de prueba. El servidor de desarrollo usado para las capturas terminó; no se dejan servicios instalados ni datos en producción.

El cierre de este avance afecta documentación y propuesta. No requiere desplegar contenedores ni ejecutar `trabajo.sh publicar`: el sitio no cambió y su implementación queda a la espera de la elección del desarrollador.

## Corrección de B: lectura y movimiento de barras

Pruebas sobre el HTML autónomo corregido, a 390, 768 y 1440 px, en claro y oscuro (seis combinaciones):

- Hover en 2019: 73 presentados y 14 leyes; foco en 2024: 69 y 9; flecha derecha: 2025; selector de 1991: 7 y 5. Todas las cifras corresponden al conjunto sintético.
- La escala permanece entre 0 y 80. En 2026, la transformación vertical cambia de 0,975 (78/80) a 0,2125 (17/80) al mostrar solo leyes. Las mediciones intermedias estuvieron entre 0,2866 y 0,3188: se comprobó movimiento de las barras, no solo del bloque.
- Repetición: alturas intermedias entre 0 y la final; termina en 0,975. Con movimiento reducido: cero animaciones activas.
- Sin desborde horizontal ni infracciones axe WCAG 2.1 A/AA en las seis vistas.
- Panorama: el selector de 2000 muestra 21 presentados y 4 leyes; la tabla contiene los 37 años.
- Capturas de portada, detalle con hover y secuencia del dibujo en `/tmp/observatorio-diseno-20261115/revision-b/`. No se midió rendimiento en un dispositivo real ni se certifica accesibilidad con lector de pantalla.

La maqueta continúa separada del sitio publicado.

## Propuesta vigente: copia íntegra del original

Las maquetas A/B anteriores se descartaron. Se verificó `copia-completa/index.html`, generada desde el servidor original local con datos sintéticos, con estos resultados:

- **58 vistas con el mismo contenido textual que el original**: se comparó SHA-256 del texto normalizado de cada `main`. Incluye cinco secciones, dieciséis fichas de hitos y los 37 listados por año.
- Inicio conserva sus 32 párrafos y 16 hitos; Cómo funciona conserva 28 párrafos y unas 3.266 palabras en esta base sintética. No se añadieron desplegables para ocultar información editorial.
- **48 vistas geométricas**: seis páginas, cuatro anchos (390, 768, 1280 y 1440 px), claro/oscuro. Sin desborde horizontal.
- **24 análisis axe**: seis páginas, móvil/escritorio y claro/oscuro. Sin infracciones WCAG 2.1 A/AA automáticas. Cero excepciones de página.
- Gráfico original: hover de 2019 muestra 73 proyectos y 14 leyes; foco de 2024, 69 y 9; el enlace del año 2000 abre su listado de 21 proyectos. Todos son datos sintéticos.
- El primer hito abre su ficha; la cronología conserva 16 entradas. Alternar Original/Pulido no modifica el texto de la metodología.
- Movimiento: se midió `scaleY = 0,806618` durante el crecimiento de una barra original (entre 0 y su estado final 1). No es una traslación del bloque. Con movimiento reducido se midieron cero animaciones activas.
- Inspección visual: portada completa de escritorio, hoja de las seis páginas en móvil y detalle del gráfico original con hover. Capturas de las seis páginas, ambos temas, en la carpeta temporal.
- Impeccable detectó 44 advertencias heurísticas en el HTML exportado: dos de bordes, nueve de espaciado, 32 de texto pequeño y una sobre una frase repetida del conjunto sintético. Varias proceden de estilos originales y plantillas inertes repetidas. No se presentan como infracciones de accesibilidad ni se eliminó contenido para satisfacerlas; se requiere juicio de diseño para los rótulos pequeños y el espacio en una futura integración.

La prueba inicial de navegación asumía incorrectamente qué hito aparecía primero en la base sintética; se corrigió para usar su enlace real. Se ajustó además el guion para sincronizar su navegación y se evitó reconstruir el contenido al saltar a un ancla de la misma página. La última ejecución terminó correctamente.

Evidencia: `/tmp/observatorio-propuesta-completa/verificacion.json`, `contenido-original.json`, `matriz.json`, capturas y secuencia del gráfico. Sin capturas versionadas. El servidor local terminó; no se instalaron servicios ni se escribió en producción.

Pendiente: lector de pantalla, teclado virtual, dispositivos táctiles reales y aprobación del desarrollador. La copia visual no reemplaza el buscador dinámico del sitio ni se despliega.
