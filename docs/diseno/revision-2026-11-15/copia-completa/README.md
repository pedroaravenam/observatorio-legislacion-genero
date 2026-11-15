# Propuesta completa sobre el sitio original

**Esta es la propuesta vigente.** Sustituye a las maquetas A/B abreviadas. El desarrollador aclaró que el Observatorio es un sitio informativo y de análisis, con orientación académica: la extensión, las explicaciones y la cronología son parte de su valor.

Abrir [la copia completa](index.html). Funciona sin conexión y permite alternar **Original / Pulido** sobre el mismo contenido. Los controles superiores sirven solo para comparar la propuesta; no se propone incorporarlos al sitio publicado.

## Qué se conserva

- El texto íntegro de Inicio, Panorama, Proyectos, Actualidad, Cómo funciona y las fichas incluidas. La copia se generó desde las páginas originales, no a partir de resúmenes.
- Las **16 leyes hito**, visibles en una cronología continua, con su explicación y enlaces. No hay «ver más» ni desplegables para esconderlas.
- El gráfico anual original: mismas barras, proporciones, colores, leyenda, cifras al pasar el cursor o enfocar y enlaces por año. Se descartan el eje añadido y los selectores de series de la maqueta anterior.
- Las tablas, metodología, límites, fuentes, fechas, autoría, contacto y apoyo. Todos los filtros del buscador siguen visibles.

Se exportaron 58 vistas: cinco secciones principales, dieciséis fichas de hitos y 37 listados por año. El conjunto permite comprobar el recorrido de las barras a sus proyectos y de los hitos a sus fichas.

## Qué cambia en «Pulido»

| Original | Pulido | Propósito |
|---|---|---|
| Apertura en una columna | Título e introducción en dos columnas en escritorio; una en móvil | Dar presencia a la apertura conservando su texto y el índice completo. |
| Ritmo de lectura actual | Interlineado y separación entre párrafos algo mayores; ancho de lectura acotado | Facilitar la lectura de argumentos largos. No se acortan. |
| Cronología íntegra | La misma cronología, con más aire entre hitos y mejor separación de fechas | Hacerla más legible sin resumir su historia. |
| Gráficos estáticos | Las barras originales crecen desde su base al entrar en pantalla; las horizontales, desde la izquierda | Dar movimiento al dato dentro de su representación conocida. No se mueve el bloque entero. |
| Títulos laterales recortados en Actualidad | Títulos completos | Conservar información que identifica cada proyecto. |
| Tablas móviles con cabeceras ocultas | Tablas desplazables con sus cabeceras | Mantener las asociaciones y permitir leerlas completas. |
| Nombres de pasos ocultos en móvil | Todos los nombres visibles | Conservar orientación sobre la tramitación. |

El hover o foco cancela la animación del gráfico que se consulta y muestra su geometría final: se prioriza leer el valor. Las cifras permanecen estables. Se respeta movimiento reducido y se puede desactivar la animación en la barra de comparación.

## Textos: propuestas separadas

**No se reemplazó ni eliminó ningún párrafo del sitio en esta copia.** Los ajustes de redacción deben revisarse como cambios editoriales completos, no como un objetivo de reducir palabras. Conviene trabajar sobre estas tres precisiones en una próxima iteración:

1. **Evolución temporal.** «Cada vez se presentan más proyectos» puede pasar a «Cómo ha cambiado el ingreso de proyectos». Se conserva todo el análisis de períodos, promedios y año en curso. El título descriptivo no presume que la tendencia seguirá siendo creciente.
2. **Origen y aprobación.** Cambiar «probabilidad» por «proporción de los proyectos que ya llegó a ser ley». Conservar los porcentajes, el numerador, el denominador y la explicación de qué son mensajes y mociones. La discusión institucional puede seguir presente, distinguiendo ese contexto de una causa demostrada por estos datos.
3. **Actualización.** Informar la fecha de los últimos datos disponibles sin atribuir el atraso a una caída del Senado que no se haya comprobado. Conservar la advertencia sobre posibles trámites faltantes y la explicación de la frecuencia de consulta.

No se propone recortar los hitos, la historia del método, las reglas específicas, los límites ni las advertencias sobre las comparaciones. Cualquier revisión sustantiva queda a elección del desarrollador.

## Datos y límites de esta copia

Los títulos institucionales y las explicaciones corresponden al código original. **Los proyectos, cifras y fechas provienen de una base sintética de prueba**: no sirven para interpretar la legislación ni comprobar su cronología histórica. Esto se advierte en la cabecera de la propuesta. El sitio publicado no se modificó.

Es una copia visual, no otro servidor de datos: incluye las búsquedas por año, pero otras combinaciones de filtros o fichas no exportadas muestran un aviso explícito. Los documentos y descargas no se simulan. El sitio real conserva su funcionalidad.

Las comprobaciones automáticas comparan el contenido de las 58 vistas contra el original local; las medidas exactas y el resultado visual figuran en [VERIFICACION.md](../VERIFICACION.md). No se afirma haber probado el teclado virtual ni un lector de pantalla real.

## Regenerar

Requiere las dependencias ya instaladas en `sitio/` y un servidor original **local con datos sintéticos** en `127.0.0.1:4173`. Desde la raíz:

```bash
node docs/diseno/revision-2026-11-15/copia-completa/generar.mjs
```

El guion rechaza destinos distintos de localhost, bloquea solicitudes de recursos externos y no abre ni controla un navegador personal. Incluye las fuentes ya usadas en el sitio y sus licencias SIL OFL. Las capturas y pruebas quedan en `/tmp/observatorio-propuesta-completa/`, sin versionarlas.
