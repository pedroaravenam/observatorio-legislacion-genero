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
