# Revisión de diseño y textos, 15 de noviembre de 2026

Estado: diagnóstico y propuestas. El desarrollador prefirió B y pidió corregir la lectura y el movimiento de las barras. **Ningún cambio aplicado al sitio.** Base revisada: `d9a30fc`. La selección de proyectos y las reglas del clasificador quedan fuera de este trabajo.

Abrir [la maqueta autónoma](propuestas.html) en un navegador: contiene seis páginas de muestra, dos variantes de portada, selector claro/oscuro y botones para repetir el movimiento. Incluye las fuentes locales y sus licencias; no requiere red. No es una implementación funcional: búsquedas, descargas y documentos no están conectados; algunos enlaces internos solo ilustran la ubicación futura. Los datos y proyectos son de demostración. Las pantallas representan los cambios principales, no reemplazan el contenido completo del sitio.

## Dictamen

Conservaría la identidad. Newsreader y Public Sans, el logo del hemiciclo, el ensayo con cifras al margen y el significado del violeta y el verde forman una base propia. La oportunidad está en reducir el esfuerzo para encontrar información, precisar algunas afirmaciones y dar movimiento a momentos concretos de lectura.

No hay evidencia para llamar al sitio «genérico» o «creado por IA». Las dos advertencias del detector de Impeccable sobre bordes son indicios estéticos, no pruebas de calidad ni razones para reemplazar el diseño.

## Alcance y evidencia

- Inspección del código y dos evaluaciones independientes: diseño/editorial y lectura técnica de gráficos/accesibilidad. Las primeras evaluaciones fueron de código; después se contrastaron con capturas y mediciones.
- Skills utilizadas: Impeccable, design-critique, frontend-design, design-taste-frontend, ui-ux-pro-max, stop-slop, emil-design-eng y referencias de movimiento. También se encontraron find-skills e Impeccable en `~/.claude/skills`; no fue necesario buscar ni instalar nuevas skills.
- Chromium sin interfaz, solo contra una copia local y una maqueta local. Sin navegador personal, producción ni navegación de terceros. Recursos externos bloqueados durante el recorrido del sitio.
- Base creada desde cero con registros sintéticos: reproduce volumen y diversidad de estados para revisar composición, no cifras legislativas reales. Los nombres de hitos y los textos institucionales que el código fija permanecen en la copia.
- Ocho rutas: Inicio, Panorama, Proyectos, Actualidad, Cómo funciona, ficha, búsqueda vacía y 404; cuatro anchos (390, 768, 1280 y 1440 px), claro y oscuro: **64 recorridos**. Sin desborde horizontal ni excepciones de página.
- axe WCAG 2.1 A/AA en 390 y 1440 px, ambos temas: **32 vistas sin infracciones automáticas**. No equivale a certificar accesibilidad: no se probó con lector de pantalla ni con usuarios.
- Capturas y salidas técnicas temporales: `/tmp/observatorio-diseno-20261115/`. No se versionan capturas. Las alturas dependen de estos datos y del ancho; no describen exactamente la producción.

## Hallazgos y propuesta por página

| Página | Evidencia | Propuesta y prioridad |
|---|---|---|
| Inicio | En 390 px, el primer bloque del ensayo comienza a 1.015 px. La apertura repite cifras que reaparecen después y el índice muestra siete enlaces. | P2: reducir la bajada, llevar el índice fuera de la franja y plegarlo en móvil. Conservar ensayo, contexto y acceso al buscador. Comparar variantes A y B. |
| Inicio, textos | «Cada vez se presentan más proyectos» no está condicionado a que los promedios continúen aumentando. El texto de origen atribuye una causa que no analiza. | P1: un título descriptivo sobre la evolución y proporciones observadas; retirar la explicación causal no medida. |
| Panorama | 37 enlaces por año de **7,6875 px** de ancho en 390 px. Las cifras se leen al enfocar, pero tocar un año requiere precisión. | P1: conservar vista general y sumar selector nativo de año con acción «Ver proyectos», detalle visible y tabla alternativa. Evaluar desplazamiento con barras amplias como alternativa; no comprimirlas para simular áreas táctiles suficientes. |
| Panorama, lectura | La columna completa es el total; la leyenda «Presentados» puede interpretarse como solo el violeta. El verde se reutiliza para distinguir origen en una tarjeta. | P1: «Altura completa: presentados. Tramo verde: hoy son ley». Reservar verde para leyes en ambas iniciativas. Conservar escala, subtotales, denominadores y advertencia sobre antigüedad. |
| Panorama, lenguaje | Usa «probabilidad» para proporciones históricas y «qué tan de género» para una clasificación de relación. | P1: «Proporción que ya llegó a ser ley» y «Relación de los proyectos con el género». Unificar nombres de niveles con la metodología. |
| Proyectos | El resumen de resultados aparece a **1.440 px** en 390 px. Texto de búsqueda, siete filtros, ayudas y dos botones preceden los resultados. | P1: dejar búsqueda, tema, año y estado visibles; agrupar origen, cámara y autoría en «Más filtros». Mantener filtros activos abiertos, valores GET, todas las capacidades y limpieza de filtros. |
| Proyectos, mensajes | «No hay una persona con ese nombre» afirma más de lo que sabe el catálogo. No todos los campos indican opcionalidad. | P2: «Ese nombre no está entre las opciones del buscador». Indicar que todos los filtros son opcionales. Mantener error junto al campo y estado vacío con salida. |
| Ficha | En el ejemplo de ley publicada, los cinco `.paso-nombre` tienen `display:none` en móvil; ningún paso queda marcado actual. La tramitación comienza a 1.705 px en esa ficha sintética. | P1: mostrar estado textual, último trámite y acceso a cronología antes de los detalles; conservar nombres accesibles de los pasos. No confundir posición visual con etapas completadas verificadas. |
| Actualidad | El aviso de atraso solo mide tiempo desde la última consulta, pero afirma que el Senado no entrega datos. Los títulos laterales se recortan. | P1: informar antigüedad sin atribuir causa. P2: títulos completos en móvil; conservar fecha, cámara y descripción original del trámite, sin fabricar resúmenes con significado legislativo nuevo. |
| Cómo funciona | Aproximadamente **3.300 palabras**, 17.073 px de alto en 390 px. Tablas móviles ocultan cabeceras con `display:none`. | P1: resumen del criterio vigente y límites visibles; historia técnica desplegable. Conservar reglas específicas y sus ejemplos. Tablas desplazables con cabeceras o bloques con etiquetas explícitas, comprobados con lector de pantalla. |
| Vacío y error | El vacío ofrece ayuda. El error general atribuye una probable mantención sin comprobarla. | P2: conservar orientación y expresar fallo sin diagnosticar su causa; ofrecer volver a Proyectos o reintentar según corresponda. |

P1 significa prioridad antes de sumar efectos; P2, refinamiento posterior. No se encontró un bloqueo total de navegación en los recorridos realizados.

## Gráficos que requieren atención adicional

La revisión cubrió las familias anual, estados, relación con género, origen, autoría por sexo, temas, temas por período, etapas, último movimiento, tiempo hasta ley y autoría parlamentaria.

- **Anual:** mantener el eje temporal completo; distinguir un año con cero proyectos de un año sin datos. El código actual equipara último año disponible a año en curso: corregir esa equivalencia si la fuente queda atrasada. No se midió que hoy falten años.
- **Contraste de series:** los colores de violeta/verde declarados tienen contraste aproximado de 1,57:1 en claro y 1,74:1 en oscuro entre sí. Probar separador o trama para que la frontera sea visible. Estos cocientes no son mediciones de contraste de texto ni implican por sí solos una infracción WCAG en un gráfico con etiquetas equivalentes.
- **Estados y niveles:** conservar textos y cifras junto a colores; no introducir anillos decorativos. Un cero no debe adquirir una barra mínima positiva.
- **Origen y autoría por sexo:** mostrar numerador y denominador; las proporciones describen el conjunto, no una probabilidad individual ni una causalidad. Mantener fuera los mensajes en las comparaciones de firmas parlamentarias.
- **Temas:** conservar que un proyecto puede contar en varios y que la asignación depende de términos del título. Los colores del mapa de calor se normalizan al máximo observado: explicitar la escala y mantener cifras legibles.
- **Etapas:** «otras etapas» es un residuo que también puede incluir datos ausentes o no reconocidos. Separar «sin información» antes de llamarlo «etapas posteriores». No se midió cuántos casos reales afecta.
- **Último movimiento:** se calcula `sinFecha`, pero no aparece entre las tres categorías visibles. Mostrarlo si es mayor que cero y mantener el denominador claro.
- **Tiempo hasta ley:** conservar mediana y tamaño del grupo, el aviso sobre cohortes recientes y la exclusión explícita de quienes todavía no son ley. Evitar interpretar la mediana como duración esperada de un proyecto pendiente.
- **Parlamentarios:** comunicar coautoría y número de proyectos, sin presentar esa cantidad como calidad o eficacia individual.

## Propuestas visuales

### A. Afinar lo actual, alternativa inicial

Conserva la apertura editorial. Título más directo, bajada breve, acciones claras e índice separado. El ensayo sigue siendo la entrada principal; las cifras mantienen su lugar al margen. En móvil el índice se despliega cuando hace falta.

Fue la recomendación inicial del agente. El desarrollador prefirió B. No requiere fotografía, nuevas fuentes, fondos decorativos ni nuevas librerías.

### B. Dar más presencia al gráfico, dirección elegida

Conserva las mismas fuentes y colores, pero coloca el gráfico anual junto al título en escritorio y debajo en móvil. Comunica desde el inicio que el sitio permite explorar datos. En la implementación final, el gráfico se movería a esa posición: no debe duplicarse más abajo como ocurre para comparar en esta maqueta parcial.

Tiene más presencia visual, aunque ocupa más altura en teléfono. Conviene elegirla si se busca una portada centrada en explorar cifras antes de leer el ensayo.

### Ajustes compartidos

Las otras cinco pantallas de la maqueta presentan filtros secundarios desplegables, resumen del último trámite, verde consistente para leyes, títulos sin recorte y metodología con dos niveles de profundidad. Son muestras de jerarquía: el texto completo, autores, donaciones, descargas y todos los gráficos se conservan en una implementación posterior.

## Corrección solicitada sobre B

El desarrollador observó que la primera maqueta perdió el hover del sitio y que no permitía leer magnitudes; además, el efecto solo movía el bloque, no sus barras. Se corrigieron los tres gráficos anuales de la maqueta:

- Escala vertical fija de 0 a 80 proyectos, con marcas cada 20 y líneas guía. El eje se mantiene al comparar vistas.
- Año, presentados y los que hoy son ley visibles; el cursor, foco, clic o selector actualizan el detalle. Las flechas izquierda/derecha, Inicio y Fin recorren los años con teclado.
- Selector nativo de año de 44 px para teléfono y tabla completa de 37 años. No se exige acertar a barras angostas.
- Barras que crecen desde su base, con valores finales legibles en el detalle. La acción «Solo los que hoy son ley» reduce las alturas y «Presentados y leyes» las restaura; verde continúa siendo un subconjunto del total.
- Botón de repetición y respeto de movimiento reducido. B abre seleccionada.
- Las magnitudes de todos los gráficos anuales ahora provienen del mismo conjunto sintético: suman los 1.467 proyectos y 258 leyes que muestra la maqueta. No son cifras de producción.

## Movimiento propuesto

| Actual | Propuesta | Motivo |
|---|---|---|
| Solo entrada del bloque | Barras que crecen desde la base y cambian de altura al alternar ambas series o solo leyes, manteniendo la escala | El movimiento muestra las magnitudes y responde a la comparación. |
| Cifras siempre iguales | Revelar los dígitos finales de una cifra destacada, sin contar desde cero; el valor accesible permanece estable | Dar presencia al dato sin simular una actualización. |
| Flechas y cambios de tema | Transiciones breves y coherentes, sin demorar foco ni búsqueda | Confirmar una acción. |
| Movimiento reducido | Presentación final inmediata, sin animaciones de entrada ni desplazamiento | Respetar la preferencia del sistema. |

La maqueta demuestra el crecimiento de las barras, la transición entre vistas, el detalle por año, la cifra de la selección y botones de repetición. La implementación debe hacer la entrada una sola vez por bloque, mantener contenido visible sin JavaScript y no reproducirla cada vez que el lector vuelve a subir. No se propone fijar el desplazamiento, parallax, bucles ni animar cada párrafo.

CSS e IntersectionObserver bastan para esta propuesta. GSAP sería una opción si se aprueba después una secuencia más elaborada; no se instaló ninguna dependencia ni se midieron 60 fps.

## Propuestas de texto

| Actual | Propuesto |
|---|---|
| «Más de tres décadas de legislación de género en Chile» | «La legislación de género en Chile, desde 1990» |
| Bajada inicial con cuatro cifras y explicación del recorrido | «Sigue los proyectos que se presentan en el Congreso, conoce sus temas y revisa cuáles llegaron a ser ley.» Las cifras pasan al bloque de selección o al resumen de la variante B. |
| «Cada vez se presentan más proyectos» | «Cómo ha cambiado el ingreso de proyectos» |
| «Qué tan de género es cada proyecto» | «Relación de los proyectos con el género» |
| «Los mensajes tienen una probabilidad mucho mayor de convertirse en ley…» | «La comparación muestra qué proporción de los mensajes y de las mociones de la selección ya llegó a ser ley.» Conservar los porcentajes calculados junto a la frase. |
| «Ver el detalle por período» enlaza a `#origen` | «Comparar mensajes y mociones» |
| «No hay una persona con ese nombre» | «Ese nombre no está entre las opciones del buscador. Escribe un apellido y elige un nombre de la lista.» |
| «El Senado no entrega datos nuevos desde el…» | «Los últimos datos disponibles en el Observatorio son del {fecha}. Pueden faltar trámites recientes.» |
| «…lo más probable es que esa fuente esté fuera de servicio…» | «Los documentos se abren en los sitios oficiales. Si un enlace no carga, puedes avisarnos mediante el contacto al pie de la página.» |
| «Probablemente el sitio está en mantención…» | «No pudimos cargar esta página. Intenta nuevamente en unos minutos.» |

Las redacciones son propuestas. No cambian el criterio ni crean conclusiones sobre los proyectos. Antes de integrar, contrastar cada frase con sus valores y estados reales y conservar el alcance exacto de los límites publicados.

## Validación y pendientes para implementar

La maqueta se revisa en los cuatro anchos, con capturas en claro y oscuro y prueba de movimiento reducido. El detalle de la última ejecución está en `VERIFICACION.md`.

- Etiquetas visibles y filtros opcionales: incluidos en la maqueta; faltan todos los controles secundarios y la conexión real.
- Controles adecuados: búsqueda y selectores nativos; no se pide escribir fechas con formato técnico.
- Validación y confirmación: el prototipo avisa que la búsqueda no está conectada; la implementación conservará errores de autor y resumen de resultados. No existe guardado que requiera confirmar éxito.
- Carga, vacío, error y deshabilitados: inspeccionados en la base; la maqueta no implementa los flujos completos. Deben conservarse y comprobarse al integrar.
- Móvil: sin desborde en la comprobación automática. Teclado virtual, uso con una mano y pantalla táctil real pendientes.
- Accesibilidad: foco visible, contraste automático y movimiento reducido comprobados según VERIFICACION. Pendiente lector de pantalla, comprensión de las tablas y revisión del desarrollador.

Siguiente decisión: revisar la corrección de los gráficos y el movimiento de B, la dirección preferida por el desarrollador. Después implementar lo acordado, verificar todas las páginas con los datos adecuados y publicar según las reglas del proyecto. La entrega actual publica solo documentación y maqueta en GitHub; no despliega una nueva versión del sitio ni reescribe la base pública.
