# Piloto de clasificación supervisada

Experimento local para medir si los veredictos editoriales ayudan a priorizar la revisión de boletines. Lee el catálogo y los veredictos versionados. La única escritura opcional es un CSV nuevo de revisión ciega.

Desde la raíz del repositorio, en un entorno de Python con `scikit-learn==1.8.0`:

```bash
python despliegue/clasificador/piloto-ml/evaluar.py
python despliegue/clasificador/piloto-ml/evaluar.py --muestra /tmp/boletines-revision-2026.csv
```

La evaluación usa títulos como única entrada, con TF-IDF y regresión logística. La validación cruzada agrupa títulos idénticos tras normalizar mayúsculas, tildes y puntuación. El vocabulario se ajusta dentro de cada pliegue. El comparador histórico se reconstruye a partir de si el veredicto humano coincidió o discrepó con el agente. El agente histórico pudo consultar más evidencia que el título.

## Resultado inicial

La cola tiene 139 veredictos humanos y el catálogo contiene títulos para 137 de ellos. Los boletines `18880-07` y `18878-07` quedan fuera de esta corrida. De los 137 evaluados, 61 fueron incluidos por el desarrollador.

| Método en los mismos 137 boletines | Inclusiones acertadas | Inclusiones erróneas | Exclusiones erróneas | Exclusiones acertadas |
| --- | ---: | ---: | ---: | ---: |
| Regresión logística, umbral 0,50 | 7 | 4 | 54 | 72 |
| Agente histórico | 49 | 14 | 12 | 62 |

La precisión promedio del orden de los puntajes fue 0,526 frente a 0,445 con un puntaje constante. Con los umbrales ilustrativos 0,35 y 0,65, 136 quedaron para revisión y la única exclusión propuesta fue errónea. Los cortes no están calibrados. La muestra está compuesta por casos dudosos, por lo que estas cifras describen esa cola y no estiman el rendimiento sobre todos los boletines.

## Evaluación siguiente

El CSV opcional fija una muestra aleatoria reproducible de 100 boletines del catálogo de 2026, sin predicciones. Excluye los boletines de los veredictos del 18 de noviembre, las respuestas registradas del 5 de noviembre, los casos de control y los títulos idénticos normalizados de esos conjuntos. Es una muestra retrospectiva separada de los datos del piloto.

Completar `incluye` y `razon` con el criterio vigente, consultando la ficha o el texto oficial cuando el título sea insuficiente. Conservar esos veredictos fuera del entrenamiento y del ajuste de umbrales. Para una segunda corrida, reunir el objeto del proyecto o un resumen en una fuente comparable para entrenamiento y evaluación. Medir cuántos proyectos pertinentes se pierden, cuántas inclusiones erróneas aparecen y qué proporción queda para revisión. Si la muestra contiene pocos casos pertinentes, ampliar la evaluación antes de sacar conclusiones sobre exclusiones.

### Textos de ingreso del Senado

El recolector lee la ficha XML y descarga solo el mensaje o la moción vinculados al boletín. No usa el sitio del Observatorio ni su base de datos. Para PDF usa `pdftotext`, para DOCX usa la biblioteca estándar de Python, para RTF reutiliza el lector del clasificador en Node y para Word antiguo usa `antiword` o `catdoc`. Con `--ocr`, si un PDF carece de texto extraíble, procesa las primeras tres páginas con `pdftoppm` y Tesseract con el idioma `spa`. Las descargas exitosas se conservan como JSON fuera del repositorio, con el boletín, la URL y el texto.

```bash
python despliegue/clasificador/piloto-ml/reunir_textos.py \
  docs/mediciones/veredictos-cola-2026-11-18.json \
  /workspace/observatorio-local/textos-ml --limite 5
python despliegue/clasificador/piloto-ml/evaluar.py \
  --textos /workspace/observatorio-local/textos-ml
```

Para reanudar, repetir el recolector con la misma carpeta y aumentar el límite según la disponibilidad de la fuente. Se puede usar `--paralelo 3` para lotes con un máximo de tres boletines en curso. El recolector omite los boletines ya guardados y se detiene ante una denegación o límite de acceso. En Codex Cloud requiere salida HTTPS a `tramitacion.senado.cl` y `www.senado.cl`. Se verificó la descarga de esos dominios tras publicar el cambio de red.

Con `--textos`, ambos modelos usan los mismos boletines y pliegues, limitados a los que tienen documento y título. Se agrupan también los documentos que comparten URL o texto completo. La versión ampliada usa el título y los primeros 6.000 caracteres del documento de ingreso, una aproximación al contexto del proyecto que puede contener encabezados o antecedentes. El informe lista los boletines sin texto. Si la cobertura difiere entre clases o años, la comparación describe únicamente el subconjunto disponible. La muestra ciega queda reservada para una evaluación posterior, una vez que tenga veredictos humanos.

### Medir sobre la muestra ciega

La muestra de 100 queda en reserva. La siguiente revisión del piloto reutiliza veredictos humanos previos y casos de control, y la evidencia futura puede venir de las validaciones que normalmente ocurren en la cola. Completar una muestra adicional es opcional.

Completar la columna `incluye` del CSV de 100 boletines con `sí`, `no` o `dudoso`. Una vez revisados todos los casos, ejecutar:

```bash
python despliegue/clasificador/piloto-ml/evaluar.py \
  --muestra-etiquetada /ruta/muestra-revisada.csv
```

El informe de la muestra se calcula aparte de la validación cruzada de la cola. Cuenta los casos dudosos y mide los que tienen un veredicto binario. El entrenamiento usa los veredictos de la cola, retirando los boletines que comparten título o documento con la muestra. El programa emite métricas agregadas, sin publicar decisiones por boletín.

Para sumar la comparación con documentos, pasar primero el CSV de la muestra al recolector con la misma carpeta usada para la cola. Después ejecutar la evaluación con `--muestra-etiquetada` y `--textos`. Se informa por separado el resultado con títulos sobre todos los casos con veredicto binario y la comparación en el subconjunto con documentos disponibles. En esa comparación ambos modelos entrenan y se evalúan con los mismos boletines.

### Resultado con documentos oficiales

Se recuperaron 129 de los 139 documentos. Ocho enlaces devolvieron un archivo vacío y otros dos entregaron texto insuficiente. Dos de los 129 documentos recuperados correspondían a boletines sin título en el catálogo, por lo que la comparación se hizo sobre 127 casos, incluidos 55 pertinentes según el veredicto humano.

| Medida en los mismos 127 casos | Solo título | Título y texto de ingreso |
| --- | ---: | ---: |
| Precisión promedio del orden de prioridad | 0,552 | 0,640 |
| Pertinentes en los primeros 32 puestos | 18 | 17 |
| Pertinentes en los primeros 64 puestos | 30 | 33 |
| Pertinentes incluidos al aplicar el umbral 0,50 | 9 de 55 | 4 de 55 |
| Inclusiones erróneas al aplicar el umbral 0,50 | 2 | 0 |
| Casos resueltos con los cortes ilustrativos 0,35 y 0,65 | 6, con 2 exclusiones erróneas | 0 |

El agente histórico incluyó 45 de los 55 pertinentes y realizó 13 inclusiones erróneas en ese mismo subconjunto. Agregar el documento mejora la métrica global de ordenamiento, pero el efecto en las primeras posiciones depende de cuánto se alcance a revisar. Por ahora no hay evidencia para automatizar exclusiones ni para estimar un ahorro de revisión sobre boletines nuevos. La evaluación independiente sigue pendiente de los veredictos humanos sobre la muestra ciega.

### Revisar los boletines con sus documentos a mano

Para preparar la página local a partir de la muestra con enlaces, usar:

```bash
python despliegue/clasificador/piloto-ml/preparar_revision.py \
  /workspace/observatorio-local/muestra-revision-ml-2026-con-fichas.csv \
  /workspace/observatorio-local/textos-ml \
  /workspace/observatorio-local/revision-ciega-ml-2026.html
```

La página muestra un boletín a la vez, con su ficha y, cuando se pudo extraer, los primeros 6.000 caracteres del documento de ingreso. Para casos dudosos conviene abrir el texto completo y leer qué dispone el articulado. Se puede marcar cada caso, saltar al siguiente pendiente y descargar un CSV compatible con `--muestra-etiquetada`. El avance se conserva en el navegador cuando el almacenamiento local está habilitado. Guardar el CSV antes de cerrar permite conservar una copia. La planilla original también se puede completar directamente. La página y el CSV carecen de puntajes del modelo.

### Reutilizar veredictos existentes

La prueba retrospectiva usó las 26 decisiones binarias registradas el 5 de noviembre y 49 casos de control con título. Se midieron por separado y se retiraron del entrenamiento los cruces por título o documento. Entre las decisiones del 5 de noviembre, 25 tenían texto y solo una correspondía a una inclusión. Ninguno de los modelos la recuperó en la primera mitad de su orden de revisión. En los 46 controles con texto, el modelo con documento puso 12 de los 22 casos esperados como pertinentes en la primera mitad de la lista, frente a 8 con solo título. Los controles son casos preparados y no representan los boletines entrantes.

El historial también registra lotes de validación del 12 al 14 de noviembre. El detalle de esos veredictos se guarda en `validacion_genero` en la base de ingesta. El lote del 18 de noviembre está además versionado como JSON. Desde un equipo que ya tenga acceso al VPS se puede exportar el conjunto completo en bloque:

```bash
bash despliegue/clasificador/piloto-ml/exportar-veredictos.sh > veredictos-validados.json
```

La consulta es de solo lectura y devuelve boletín, título, decisión y fecha. Codex Cloud carece de la configuración SSH del VPS y el exportador solo se validó sintácticamente en este entorno.

Una vez copiado el JSON a la nube, evaluar los veredictos adicionales con:

```bash
python despliegue/clasificador/piloto-ml/evaluar.py \
  --veredictos-exportados /ruta/veredictos-validados.json
```

El evaluador descuenta los boletines ya usados para entrenar, valida el formato de la exportación y usa el título exportado si el catálogo todavía no contiene el boletín. Con `--textos` informa también la comparación sobre los casos con documentos y agrupa títulos o documentos compartidos para evitar cruces con el entrenamiento. El recolector acepta el JSON de veredictos exportados para reunir esos documentos.
