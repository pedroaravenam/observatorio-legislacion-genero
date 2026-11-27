# Mejora del clasificador de género (noviembre de 2026)

Rama de trabajo: `mejora-criterio-precedentes` (sin fusionar). Rama aparte con el piloto de ML: `piloto-ml-clasificacion` (sin fusionar). **Regla del desarrollador: nada se fusiona hasta que funcione perfecto.**

## Pregunta

¿Cómo reducir los desacuerdos entre el agente y el desarrollador? Punto de partida: en la cola del 18-11-2026 el agente coincidió en 113 de 139 casos (81 %), con 12 falsos negativos y 14 falsos positivos. Todos los errores caen en la frontera del nivel `debil`.

## Experimentos y resultados

Cada fila dice qué se midió y con qué datos. «Quemado» significa que el caso se usó para escribir una regla y ya no sirve para validarla.

| Id | Qué se probó | Datos | Resultado | Conclusión |
|---|---|---|---|---|
| E1 | ML con título (TF-IDF + regresión logística), rama `piloto-ml-clasificacion` | 137 casos de la cola | Precisión promedio 0,526 contra 0,445 del azar | Apenas sobre el azar; el agente histórico acierta mucho más |
| E2 | Validación cruzada repetida 5×5, agrupada por título (`experimentos/cv_repetida.py`) | 201 veredictos humanos con título | Azar 0,408. TF-IDF 0,514; embeddings MiniLM 0,482; con etiquetas automáticas ponderadas 0,501 a 0,520. AUC entre 0,55 y 0,60 | El título solo no predice el criterio en casos dudosos. No se probaron modelos de embeddings más grandes |
| E3 | Recuperar precedentes parecidos: palabras compartidas contra embeddings (`recuperacion_precedentes.py`) | 212 veredictos validados, uno contra el resto | El voto de 5 vecinos acierta: palabras 0,573; MiniLM 0,651; mpnet 0,646. Responder siempre «excluye» da 0,613 | Los embeddings mejoran poco y está en el límite del ruido. No se integró al clasificador |
| E4 | Análisis de los 26 desacuerdos de la cola (`datos/cola-…tsv`, razones en `datos/razones-cola-…borrador.json`) | 139 casos | Los 14 falsos positivos vienen de «en la duda, entra» con género solo en fundamentos. Los 12 falsos negativos son familia y matrimonio, que el criterio excluía por el tema | Dio las hipótesis de E5. 139 de 212 veredictos guardan una razón automática («coincide/discrepa»), inútil como precedente |
| E5 | Criterio v1 (`agente-c33efc29`): familia, matrimonio, cuidado personal e implicancia de género | 50 controles y 28 pendientes (`resultados/`) | Controles: 45 de 50; las 5 fallas eran controles desactualizados (pornografía infantil, decisión del 13-nov), ya corregidos. Pendientes: 23 de 28 contra 28 de 28 del agente anterior | La regla de implicancia de género fue demasiado estricta: falló los 5 casos que cambió. Las reglas de familia no se pudieron medir (ningún pendiente era de familia) |
| E6 | Criterio v2: se relajó la regla de implicancia de género | Ninguno | Ver E7 | Reemplazado por E7 |
| E7 | Iterar el criterio sobre los 31 casos donde el agente falló (`datos/casos-objetivo.json`: 26 de la cola y 5 pendientes corregidos). Tres rondas de 31 llamadas, 93 en total | 31 casos, por definición «quemados» | Ronda 1 (`agente-402653ba`): 18 de 31. Ronda 2 (`agente-4416aad7`, regla de implicancia reescrita): 21. Ronda 3 (mismo criterio, con el articulado en la evidencia): 21, pero cambió el conjunto de fallas (arregló `14638-07`, falló `4759-07`) | Las 10 fallas restantes tienen confianza media o baja, así que irían a la cola de validación; **0 errores con confianza alta**. `4759-07` pasó en la ronda 2 y falló en la 3 con el mismo criterio: la variación entre corridas es de 1 o 2 casos |
| E8 | Hallazgo: el agente no recibía el articulado, solo el inicio del texto y fragmentos alrededor de palabras del léxico, que caen sobre todo en los fundamentos | Texto de 11 proyectos | Se agregó `extraerArticulado` a `lib.mjs` y a la evidencia (3 pruebas nuevas). Extrae el articulado de los 11 textos reales | Cambio de código, no de criterio. `versionAgente` solo mira `criterio.md`, así que **el formato de la evidencia no cambia la versión** |
| E9 | Ronda 4 (`agente-9d40393a`): reglas nuevas tras las respuestas del desarrollador (excepciones VIF y trata, beneficios a familias, cifras por sexo que reproducen la ley, ejemplos de contexto general) y dos veredictos corregidos por el desarrollador (`14921-07`, `13663-06`). 31 llamadas, 124 en total | Los mismos 31 casos, en memoria de entrenamiento | **30 de 31**. Falla solo `1611-10` (sin texto, confianza baja, iría a la cola) | Los 30 aciertos son **sobre los casos con los que se escribieron las reglas**: no prueban que generalicen. Falta una prueba con casos nuevos y la regresión de los 50 controles |
| E10 | Regresión: los 50 controles con el criterio final (`agente-8945b3a0`, con la regla del 65/60 reescrita). 50 llamadas, 174 en total | 50 casos de control, ya con los 5 de pornografía infantil corregidos | **50 de 50**. Un nivel distinto del esperado (`6647-07`: esperado `debil`, el agente dijo `tema_central`) | Sin regresión. Los controles son casos preparados, no un conjunto independiente |
| E11 | Criterio final (`agente-8945b3a0`) sobre los 23 pendientes de la cola viva que el desarrollador validó y sobre los que no se escribió ninguna regla (`resultados/pendientes23-…`). 23 llamadas, 197 en total | 23 casos, todos de confianza media o baja salvo los que muestra el registro | **23 de 23** contra el veredicto del desarrollador | Los cambios del día no dañaron lo que ya estaba bien. Son casos tranquilos (el agente anterior también acertaba 23 de 23), así que esto detecta daños y no prueba mejora en casos dudosos |
| E12 | Muestra aleatoria de 29 casos con veredicto del desarrollador (`datos/veredictos-muestra-aleatoria-…`: 19 publicados como débil y 10 descartados; excluye lo ya usado). Ronda 7 con `agente-8945b3a0`: **23 de 29**. Se ajustó el criterio (listas de categorías, delitos de toda la familia, proyectos penales o tributarios, acoso, cuidado personal) y la ronda 8 con `agente-c0caa03a` dio **28 de 29**. 58 llamadas, 255 en total | 29 casos que no se usaron para escribir las reglas iniciales (pero las reglas nuevas se escribieron mirando los 6 desacuerdos de la ronda 7) | Ronda 7: 23 de 29, con 14 decisiones de confianza alta sin ningún error. Ronda 8: 28 de 29; la falla nueva es `16484-24` (Día Nacional de la Funcionaria de la Primera Infancia), excluida por la regla de feriados. Se agregó la regla de homenajes a mujeres | Los 6 casos de la ronda 7 quedaron quemados. El 28 de 29 mide solo si los arreglos funcionan, no si generalizan. Falta repetir los casos objetivo (31), los 23 pendientes y los 50 controles con el criterio nuevo |
| E13 | Regresión de los 31 casos objetivo con el criterio `agente-dae0bc91` (incluye la regla de homenajes a mujeres). 31 llamadas, 286 en total | Los 31 casos objetivo | **29 de 31** (la ronda 4 había dado 30). Fallan `1611-10` (sin texto ni razón conocida) y `14638-07` (acertaba en las rondas 3 y 4; el agente dice «sin argumento de género ni brecha», aunque los fundamentos citan la brecha de pensiones 320 mil contra 192 mil) | Un caso retrocedió. Puede ser la variación entre corridas (1 o 2 casos) o efecto de las reglas nuevas; no se separó. Falta la regresión de los 23 pendientes y los 50 controles |
| E14 | Regresión final con `agente-dae0bc91`: 50 controles y 23 pendientes sin reglas a medida. 73 llamadas, 359 en total | 50 + 23 casos | Controles **50 de 50** (un nivel distinto, `6647-07`, como antes). Pendientes **23 de 23** | Sin daño en lo que ya funcionaba con el criterio de esta rama. Es la última medida con el criterio vigente; los 31 objetivo dieron 29 y la muestra aleatoria 28 de 29 (esta última, con la versión anterior a la regla de homenajes) |
| E15 | Repaso final con `agente-dae0bc91` y el cambio de fragmentos (núcleo de género reservado). **Cortado por el límite de uso**: 31 objetivo **31 de 31** (con `1611-10` corregido a «excluye»); 29 de la muestra **28 de 29** (falla `2252-04`, confianza baja); 23 pendientes **incompleto** (16 de 23 fallaron por el límite; de 7, 6 aciertos y falla `17003-11`, salud mental, por la cláusula de terapias de conversión); 50 controles **no corrieron** (50 fallas por el límite) | Los mismos conjuntos | Pendiente repetir pendientes y controles cuando haya cupo | Las fallas por límite no son errores del agente. Las 2 nuevas (`2252-04`, `17003-11`) vienen de reglas de esta rama |
| E16 | Se completó el repaso cortado (66 llamadas, dentro de las 133 aprobadas): los 16 pendientes que fallaron por el límite y los 50 controles, con `agente-dae0bc91` | 16 + 50 casos | Pendientes **15 de 16** (falla `18044-13`); con los 7 de E15, **21 de 23**. Controles **50 de 50** | Repaso completo: objetivo 31/31, muestra 28/29, pendientes 21/23, controles 50/50. Las 3 fallas (`2252-04`, `17003-11`, `18044-13`) esperan decisión del desarrollador: en `17003-11` y `18044-13` el agente cita disposiciones del articulado que antes no veía |
| E17 | Revisión paso a paso de las 3 fallas del repaso, con el texto de cada proyecto. El desarrollador corrige sus veredictos: `2252-04` (embarazadas adolescentes en los fundamentos), `17003-11` (prohibición de terapias de conversión) y `18044-13` (corresponsabilidad, un tercio de mujeres en los consejos, informe de brechas) pasan a **incluye débil**: el agente acertaba. Principio que fija: pesa más la reducción de brechas de género que la materia. Además se corrige `extraerArticulado` (no reconocía «Artículo primero», «Artículo 1o.», «Artículo 1:», «PROYECTO DE LEY Modifíquese…», ni el encabezado espaciado; y tomaba citas o resúmenes de los fundamentos) | 132 casos, solo evidencia (0 llamadas) | Antes 15 casos con texto quedaban sin articulado y 2 tomaban fundamentos; ahora 1 sin articulado (`6212-13`). Cambia la evidencia de 17 casos | Con los veredictos corregidos, el repaso queda 31/31, 29/29, 23/23, 50/50. Falta repetir los 17 casos cuya evidencia cambió |
| E18 | 17 casos cuya evidencia cambió con el extractor nuevo, criterio `agente-dae0bc91` | 17 casos | 15 de 17. Fallan `5308-18` (el desarrollador lo corrige a incluye débil: exime a quien mata a su agresor tras sufrir sevicias, pensado para mujeres víctimas de VIF) y `17277-07` (el agente lo excluye; el desarrollador mantiene incluye débil) | Se amplía la regla de fundamentos: cuenta una brecha dada expresamente como razón de la medida aunque no esté medida; y «nombrar no es argumentar» en las materias que quedan fuera (salud, educación, reforma constitucional). Criterio `agente-787ccdde` |
| E19 | Repaso completo con `agente-787ccdde` | 133 casos | Objetivo 31/31, muestra 29/29, controles 50/50, pendientes 22/23 (falla `1787-02`, ley del deporte: brecha solo diagnosticada) | El desarrollador mantiene `1787-02` fuera; se agrega «la brecha cuenta solo si la medida apunta a ella». Criterio `agente-3707d95b` |
| E20 | 43 casos que dependen de la regla de fundamentos (31 objetivo + 12) con `agente-3707d95b` | 43 casos | 42 de 43. Falla `14608-13` (cierre del comercio a las 19:00) | Leyendo el texto (70% del retail son mujeres; inseguridad nocturna y cuidados como razón de la medida) el desarrollador lo cambia a incluye débil. Se quita del criterio el ejemplo de «rubro mixto como el comercio». Criterio final `agente-aa31fa2a`, pendiente repaso completo |
| E21 | Repaso completo con `agente-aa31fa2a` | 133 casos | Objetivo 30/31, muestra 28/29, pendientes 23/23, controles 49/50. Fallan `14638-07`, `18018-13` y `5087-07`, los tres casos que el agente ya alternaba | El desarrollador mantiene `14638-07` incluido (efecto real sobre las mujeres) y `18018-13` fuera (antecedente de género sin medida). Se agrega: cuenta el efecto de la medida que recae sobre todo en las mujeres por la brecha que describen los fundamentos. Criterio `agente-96e40132` |
| E22 | 45 casos de la regla de fundamentos con `agente-96e40132` | 45 casos | 44 de 45. Falla `5087-07`: la regla «Pensiones» (pensión garantizada universal = componente) contradecía el control | El desarrollador lo incluye como débil; se aclara que una palabra ambigua no basta pero no deja fuera el proyecto si entra por su materia. Criterio final `agente-b0889fdd` |
| E23 | 50 controles con `agente-b0889fdd` | 50 casos | **50 de 50** (nivel distinto en `5087-07` y `6647-07`) | Criterio final probado. Las diferencias restantes entre corridas son de casos dudosos con confianza baja o media, que van a la cola de validación |

Nota sobre E5: los 28 pendientes no son comparables con la cola. La cola eran casos límite escogidos a propósito; los pendientes son los de siempre. Que el agente acierte 28 de 28 no demuestra nada sobre la frontera.

## Casos quemados (no usar para validar)

- Los 26 desacuerdos de la cola y los 5 controles de pornografía infantil.
- Los 5 pendientes que cambiaron con el criterio v1: `18020-06`, `17411-07`, `12535-21`, `17117-03`, `17483-07`.

## Estado del criterio (`criterio.md`, sin commit)

- Familia y matrimonio: se lee el articulado, no se excluye por el tema.
- Cuidado personal: entra como `debil` si regula la relación entre padres separados (compartido sin acuerdo, visitas, mediación obligatoria, alimentos). Confirmado por el desarrollador tras leer el articulado de 4 proyectos.
- Implicancia de género: versión v2 relajada (disposición expresa acotada, oficios feminizados, femicidio nombrado en el articulado). Sin medir.

## Decisiones tomadas

- El ML sobre título no sirve para esta cola. Si se retoma, será solo para ordenar la revisión.
- No se instala un LLM local: la máquina tiene 15 GB de RAM y una GPU de 4 GB.
- La mejora viene del criterio y de las razones reales en los precedentes, no de un modelo nuevo.

## Pendiente

1. Confirmar las 10 razones marcadas «por confirmar» en `datos/razones-cola-2026-11-18-borrador.json`.
2. Validar el criterio v2 con casos que no estén quemados: la muestra ciega de 100 boletines del piloto de ML, o casos nuevos de la cola.
3. Medir las reglas de familia con casos de familia (los 12 falsos negativos siguen sin evidencia a favor).
4. Aplicar a la base los 28 veredictos de `datos/veredictos-pendientes-2026-11-24.json`. Lo hace el desarrollador: `node despliegue/clasificador/clasificar.mjs resolver --archivo docs/mediciones/mejora-clasificador-2026-11/datos/veredictos-pendientes-2026-11-24.json --aplicar --esperados 28`, después de un respaldo fresco (`despliegue/respaldar-ingesta.sh`). El ensayo sin `--aplicar` ya pasó.
5. Reescribir las razones de los precedentes en la base, con las de `datos/razones-…` ya confirmadas.

## Estado del entorno (fuera del repositorio)

- `observatorio-noche.timer` está **apagado** desde el 21-11. Reactivar con `systemctl --user enable --now observatorio-noche.timer`. Al reactivarlo reevalúa cientos de decisiones con la versión vigente de `criterio.md`.
- El contenedor `obs-ml-copia` (copia del respaldo del 19-11) sigue corriendo. Eliminar con `docker rm -fv obs-ml-copia`.
- El entorno de Python de los experimentos vive en el scratchpad. Para repetirlo: `python -m venv venv && venv/bin/pip install scikit-learn==1.8.0 fastembed`.

## Cómo repetir los experimentos

Desde la raíz del repositorio y con el contenedor corriendo:

```bash
despliegue/clasificador/experimentos/extraer.sh /ruta/datos
python despliegue/clasificador/experimentos/embeddings_titulos.py /ruta/datos sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 /ruta/datos/emb.npz
python despliegue/clasificador/experimentos/cv_repetida.py /ruta/datos /ruta/datos/emb.npz
python despliegue/clasificador/experimentos/recuperacion_precedentes.py /ruta/datos
```

`embeddings_titulos.py` y `cv_repetida.py` leen `datos/referencia/titulos-boletines-1990-2026.csv` con ruta relativa a la raíz.
