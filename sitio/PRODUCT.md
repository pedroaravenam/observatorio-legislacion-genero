# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas que necesitan saber qué se ha legislado sobre género en Chile y en qué está cada iniciativa: ciudadanía interesada, periodistas, investigadoras e investigadores, organizaciones de la sociedad civil, estudiantes y equipos parlamentarios. Llegan desde el teléfono o el computador, sin cuenta, muchas veces sin conocer el proceso legislativo. (Inferido del repositorio y del sitio publicado; no confirmado con una entrevista de usuarios.)

## Product Purpose

Mantener al día, de forma pública y gratuita, el seguimiento de los proyectos de ley sobre género presentados en el Congreso de Chile desde 1990: primero dar el contexto (cuánto se legisla, sobre qué, quién lo presenta y qué llega a ser ley) y después permitir buscar cada proyecto con su tramitación y sus fuentes oficiales.

## Positioning

Es un proyecto independiente y sin fines de lucro, de código abierto (AGPL-3.0), que publica su criterio de selección y sus datos completos para que cualquiera pueda revisarlos y discutirlos. No lo patrocinan ni lo operan el Senado, la Cámara ni la Biblioteca del Congreso Nacional.

## Operating Context

- Los datos se consultan cada día al servicio de tramitación del Senado; el sitio lee una copia propia (SQLite) y nunca consulta las fuentes en el momento.
- La selección de género la decide el desarrollador con un criterio publicado en «Cómo funciona»; los proyectos nuevos los clasifica un agente que aplica ese criterio.
- Cada cifra visible se recalcula desde la base y lleva fuente y fecha.

## Capabilities and Constraints

- Portada de contexto (nueva), Panorama ampliado, buscador de proyectos con filtros y descargas CSV y JSON, ficha por boletín, «Cómo funciona».
- SvelteKit con Node; funciona sin JavaScript (formularios GET) y debe seguir haciéndolo.
- Todo en español de Chile. No se afirma nada que no se haya medido en la base.
- El rediseño no cambia qué proyectos forman la selección.
- Modo claro y modo oscuro, con selector visible; por defecto sigue al sistema.
- Contacto: `contacto@legislaciongenero.cl` (el dominio usa Resend; la recepción estaba pendiente de activar el 12-11-2026).
- Financiamiento: se abrirán Mercado Pago, GitHub Sponsors y Ko-fi o Buy Me a Coffee. **Sin decidir:** las cuentas y sus direcciones no existen todavía; un canal no se muestra hasta tener su enlace real.
- Autoría: nombre del desarrollador (Pedro Aravena) y una breve reseña. **Sin decidir:** el texto de la reseña.

## Brand Commitments

- Nombre: Observatorio de Legislación de Género. Dominio: legislaciongenero.cl.
- Violeta y verde, los colores del movimiento feminista: verde marca lo que llegó a ser ley; violeta, lo que sigue en tramitación y la identidad del sitio.
- Voz clara y sobria, sin jerga legislativa sin explicar; se dice cuando un dato es derivado o falta.
- El pedido del 12-11-2026 fue «modernizar un poco» la interfaz, no reemplazar la identidad.

## Evidence on Hand

- Base pública con 18.659 boletines y 1.589 proyectos en la selección al 12-11-2026 (332 publicados como ley, 779 en tramitación).
- Leyes de la selección con número y fecha de publicación (sirven como hitos verificables).
- No hay testimonios, prensa ni cifras de uso; no se inventan.

## Product Principles

1. Contexto antes que listado: primero entender, después buscar.
2. Cada cifra se puede rastrear hasta su fuente y su fecha.
3. Se muestra el criterio y sus límites, no solo el resultado.
4. Independencia visible: quién lo hace, cómo se financia, cómo escribirle.

## Accessibility & Inclusion

WCAG 2.1 AA en claro y oscuro (se verifica con axe-core), navegación completa con teclado, áreas táctiles de 44 px, el estado nunca se comunica solo con color, respeto de `prefers-reduced-motion`.
