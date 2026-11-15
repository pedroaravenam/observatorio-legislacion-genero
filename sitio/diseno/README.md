# Logo del Observatorio

Hemiciclo: tres semicírculos violeta (los escaños del Congreso y la cúpula de un observatorio) con un tramo verde en cada uno, por lo que llegó a ser ley. Colores y tipografías son los del sitio (`src/app.css`).

Regenerar todo, desde `sitio/`: `node diseno/generar-logo.mjs`. El guion escribe en `diseno/logo/` y también reescribe los archivos que usa el sitio (`src/lib/assets/favicon.svg`, `static/apple-touch-icon.png`, `static/imagen-compartir.png`). Para cambiar el logo se edita ese guion, no los archivos generados.

| Archivo (`logo/`)                                    | Uso                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `sello`                                              | Cuadrado de esquinas redondeadas, violeta, con la marca clara. Es el favicon y el sello de la cabecera. |
| `sello-cuadrado`                                     | Igual, sin esquinas redondeadas (para tiendas de aplicaciones o perfiles que recortan solos).           |
| `marca-para-fondo-claro` / `marca-para-fondo-oscuro` | Solo los arcos, sin fondo, a dos colores.                                                               |
| `marca-negro` / `marca-blanco`                       | Solo los arcos, de un solo color (sellos, impresión en una tinta).                                      |
| `horizontal-para-fondo-claro` / `-oscuro`            | Sello y nombre en dos líneas.                                                                           |
| `horizontal-marca-para-fondo-claro` / `-oscuro`      | Arcos sin sello y nombre en dos líneas.                                                                 |
| `imagen-compartir.png`                               | Tarjeta de 1200×630 (a 2×) para redes.                                                                  |

Cada versión viene en `.svg` y en `.png` con fondo transparente (los PNG son de 1024 px de lado o 2112 px de ancho). Los SVG con letras llevan la tipografía incrustada, así que se ven bien en un navegador; en Illustrator o Inkscape conviene usar el PNG o convertir el texto a curvas.
