<script lang="ts">
	import Autoria from '../../lib/Autoria.svelte';
	import { CONTACTO } from '#lib/sitio';
	import { TEMAS } from '#lib/temas';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const numero = new Intl.NumberFormat('es-CL');
	const s = $derived(data.senales);
	const n = (...claves: string[]) => numero.format(claves.reduce((a, c) => a + (s[c] ?? 0), 0));
	const total = $derived(numero.format(Object.values(s).reduce((a, b) => a + b, 0)));
</script>

<svelte:head>
	<title>Cómo funciona · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Qué entendemos por legislación de género, cómo seleccionamos los proyectos, de dónde vienen los datos y cada cuánto se actualizan."
	/>
</svelte:head>

<article class="contenedor texto">
	<h1>Cómo funciona</h1>

	<p class="entrada">
		El Observatorio sigue los proyectos de ley sobre género presentados en el Congreso de Chile
		desde 1990. Para eso reúne la tramitación que publica el Senado, aplica un criterio propio para
		decidir qué proyectos tratan temas de género y actualiza los datos todos los días. En esta
		página explicamos ese criterio, cómo se aplica y de dónde viene cada dato, de modo que
		cualquiera pueda revisar nuestras decisiones y, si no está de acuerdo, discutirlas.
	</p>

	<nav class="indice" aria-label="En esta página">
		<ol>
			<li><a href="#criterio">Qué entendemos por legislación de género</a></li>
			<li><a href="#seleccion">Cómo seleccionamos los proyectos</a></li>
			<li><a href="#temas">Temas</a></li>
			<li><a href="#datos">De dónde vienen los datos</a></li>
			<li><a href="#actualizacion">Cómo se actualizan</a></li>
			<li><a href="#limites">Lo que todavía no cubre</a></li>
			<li><a href="#descarga">Descargar los datos</a></li>
			<li><a href="#correcciones">Código, datos y correcciones</a></li>
			<li><a href="#quien">Quién hace este sitio, contacto y apoyo</a></li>
		</ol>
	</nav>

	<h2 id="criterio">Qué entendemos por legislación de género</h2>
	<p>
		No basta con que un proyecto mencione a las mujeres para considerarlo de género. Lo que miramos
		es su contenido, es decir, qué regula y a quién afecta. Con esa idea ordenamos los proyectos en
		cuatro niveles de relación con el género: los tres primeros forman parte de la selección y el
		cuarto queda fuera. Ante una duda razonable, el proyecto entra, pero queda marcado como relación
		débil.
	</p>
	<table>
		<caption class="visualmente-oculto">Grupos del criterio de selección</caption>
		<thead>
			<tr
				><th scope="col">Grupo</th><th scope="col">Qué incluye</th><th scope="col">Ejemplos</th></tr
			>
		</thead>
		<tbody>
			<tr>
				<td>El género es el tema central</td>
				<td>
					El objeto del proyecto es proteger o ampliar los derechos de las mujeres, prevenir o
					sancionar la violencia y la discriminación por sexo o género, o reconocer derechos de las
					personas por su orientación sexual o identidad de género.
				</td>
				<td>
					Ley de femicidio, Ley Gabriela, identidad de género, tres causales, Ministerio de la
					Mujer.
				</td>
			</tr>
			<tr>
				<td>Una parte del proyecto trata de género</td>
				<td>
					El proyecto regula un tema general, como trabajo, pensiones, salud o familia, pero
					contiene al menos una disposición expresa sobre igualdad de género, protección de las
					mujeres, maternidad o cuidados. También entran los casos en que el efecto sobre las
					mujeres no se declara, pero se comprueba en el texto.
				</td>
				<td>
					Postnatal parental, sala cuna, pensión de alimentos, acuerdos comerciales con un capítulo
					de género.
				</td>
			</tr>
			<tr>
				<td>Relación débil o dudosa</td>
				<td>
					El proyecto toca el género de forma lateral, o hay una duda razonable sobre si cumple el
					criterio: una disposición aislada, un efecto que solo se deduce del contexto o una materia
					vecina. Entra a la selección, marcado como relación débil.
				</td>
				<td>
					Ley general contra la discriminación, un monumento a las mujeres de la Guerra del
					Pacífico, cláusulas que discriminan a personas con VIH.
				</td>
			</tr>
			<tr>
				<td>Queda fuera</td>
				<td>
					Los términos aparecen solo de paso: «género» en el sentido de mercadería, mujeres
					nombradas en una lista de beneficiarios sin un trato distinto, o el sexo dentro de una
					cláusula genérica de no discriminación.
				</td>
				<td>
					Reajustes de remuneraciones, calles o feriados que honran a una mujer sin referirse a su
					trayectoria como tal.
				</td>
			</tr>
		</tbody>
	</table>
	<p>
		Además, clasificamos por tema y no por postura. Un proyecto que busca restringir el aborto o la
		identidad de género también se incluye, porque trata una materia de género. Así, el Observatorio
		muestra el debate completo y no solo las iniciativas que amplían derechos.
	</p>

	<h2 id="seleccion">Cómo seleccionamos los proyectos</h2>
	<p>
		Aplicar ese criterio a mano sobre más de 18.000 proyectos no es posible, de modo que la
		selección combina reglas automáticas con la lectura de los casos dudosos. Las reglas buscan los
		términos de un léxico de género, con cerca de cuarenta entradas agrupadas por tema, como
		«femicidio», «sala cuna», «identidad de género» o «pensión de alimentos». Los términos que casi
		siempre indican un tema de género pesan más que los que pueden aparecer en otros contextos, y
		las palabras demasiado generales, como «familia» o «menores», no bastan por sí solas.
	</p>
	<p>
		Cada proyecto pasa por los pasos siguientes, en orden, y queda registrado el paso que lo
		incluyó. Esa razón se muestra en su ficha.
	</p>
	<ol class="pasos-metodo">
		<li>
			<h3>Título</h3>
			<p>
				Si el título contiene un término claro del léxico, como «violencia contra la mujer», el
				proyecto entra. También entra si contiene un término relacionado, como «maternidad»,
				«discriminación» o «delitos sexuales». Por esta vía se incluyeron
				<strong>{n('T1_titulo_estricto', 'T2_titulo_medio')}</strong> proyectos.
			</p>
		</li>
		<li>
			<h3>Texto del proyecto</h3>
			<p>
				Muchos proyectos tienen títulos técnicos que no anticipan su contenido. Por eso, en los
				presentados desde 2020 contamos cuántas veces aparecen los términos del léxico por cada
				10.000 caracteres de texto, unas tres páginas. Con 5 apariciones o más el proyecto entra,
				porque a partir de esa cifra el tema suele estar presente aunque no sea el principal. Sin
				embargo, en los textos muy largos, como los tratados comerciales, la proporción queda baja
				aunque el tema esté, así que los que suman 5 términos o más se leyeron uno a uno. Por esta
				vía se incluyeron
				<strong
					>{n(
						'T3_cuerpo_firme',
						'T4_cuerpo_amplio',
						'V2_conteo_absoluto',
						'V_validado_densidad_baja'
					)}</strong
				> proyectos.
			</p>
		</li>
		<li>
			<h3>Materias asignadas por el Senado</h3>
			<p>
				El Senado etiqueta parte de los proyectos con materias, como «violencia intrafamiliar». Si
				esas materias corresponden al léxico, el proyecto entra aunque el título no lo diga. Así se
				incluyeron <strong>{n('T5_materias')}</strong> proyectos. Esta vía tiene un alcance limitado,
				porque desde 2020 casi ningún proyecto trae materias.
			</p>
		</li>
		<li>
			<h3>Texto de la ley</h3>
			<p>
				Cuando un proyecto se convierte en ley, revisamos también el texto publicado en la
				Biblioteca del Congreso, que puede incluir disposiciones de género agregadas durante la
				tramitación. Leímos las leyes que contenían al menos un término del léxico y que los pasos
				anteriores habían dejado fuera, y agregamos las que cumplen el criterio. Esa lectura se hizo
				con apoyo de un modelo de lenguaje, siguiendo los grupos descritos arriba, y por esta vía se
				incluyeron <strong>{n('L_texto_ley_fuera')}</strong> proyectos.
			</p>
		</li>
		<li>
			<h3>Depuración</h3>
			<p>
				Por último, se retiran los falsos positivos conocidos. Por ejemplo, salen los reajustes de
				remuneraciones del sector público, que nombran a las trabajadoras solo de paso, y los
				proyectos que entraron por su texto pero cuya ley final no conserva ningún término de
				género.
			</p>
		</li>
		<li>
			<h3>Proyectos nuevos</h3>
			<p>
				Desde la selección del 22 de octubre de 2026, los proyectos que ingresan se evalúan cada día
				con un agente, es decir, un modelo de lenguaje al que le damos este mismo criterio. El
				agente recibe el título, las materias del Senado y lo que dice el texto del proyecto
				(cuántas veces aparecen los términos del léxico y los fragmentos donde aparecen), decide en
				cuál de los cuatro niveles queda y deja una explicación breve con su nivel de confianza, que
				se muestra en la ficha. Por esta vía se incluyeron
				<strong>{n('A1_agente_tema_central', 'A2_agente_componente')}</strong> proyectos.
			</p>
			<p>
				Estas decisiones son automáticas: ninguna persona las revisa antes de que se publiquen. Para
				saber cuánto confiar en ellas, comparamos al agente con la selección anterior en una muestra
				de 51 proyectos presentados desde 2018, y coincidieron en 39. El agente no incluyó ninguno
				de los 21 proyectos que la selección anterior había dejado fuera. En los 12 casos distintos,
				dejó fuera proyectos que la selección anterior había incluido por una palabra del léxico,
				como «madre» en un proyecto sobre los derechos de la Madre Tierra, o «víctimas» en uno sobre
				homenajes a violadores de derechos humanos. Esos casos nos llevan a revisar, más adelante,
				si hay otros proyectos de la selección original que entraron por la misma razón.
			</p>
		</li>
	</ol>
	<p>
		El resultado es una selección de <strong>{total}</strong> proyectos, que es lo único que muestra el
		Observatorio. Un proyecto que no cumple el criterio no aparece en las búsquedas ni tiene ficha aquí,
		aunque sí puedes encontrarlo en el sitio del Senado.
	</p>
	<p>
		Para comprobar que las reglas no dejan fuera demasiados casos, leímos una muestra de 100 leyes
		que no contenían ningún término del léxico, y ninguna resultó ser de género. Con ese resultado
		podemos afirmar, con un 95 % de confianza, que menos del 3 % de las leyes sin términos del
		léxico trata temas de género.
	</p>

	<h2 id="temas">Temas</h2>
	<p>
		Cada proyecto de la selección se asigna a uno o más temas según los términos de su título, y esa
		clasificación es la que usan el filtro del <a href="/proyectos">buscador de proyectos</a> y el
		<a href="/panorama">panorama</a>. Por lo tanto, un proyecto puede tener varios temas, pero
		también ninguno, cuando entró por su texto o por su ley y el título no lo anticipa.
	</p>
	<dl class="temas">
		{#each TEMAS as t (t.clave)}
			<div>
				<dt><a href="/proyectos?tema={t.clave}">{t.nombre}</a></dt>
				<dd>{t.descripcion}</dd>
			</div>
		{/each}
	</dl>

	<h2 id="datos">De dónde vienen los datos</h2>
	<table>
		<caption class="visualmente-oculto">Fuentes de datos del Observatorio</caption>
		<thead>
			<tr><th scope="col">Fuente</th><th scope="col">Qué aporta</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>Senado de la República</td>
				<td>
					La ficha de cada proyecto: título, autores, materias, estado, etapa y tramitación completa
					en ambas cámaras, además del enlace al texto original.
				</td>
			</tr>
			<tr>
				<td>Biblioteca del Congreso Nacional</td>
				<td>
					El texto de las leyes publicadas, que usamos en la selección y enlazamos desde cada ficha,
					y las reseñas parlamentarias, de donde sale el sexo de quienes la Cámara no informa.
				</td>
			</tr>
			<tr>
				<td>Cámara de Diputadas y Diputados</td>
				<td>
					El servicio de diputados, que informa el sexo de cada diputada y diputado desde 1990.
					Todavía no incorporamos su partido ni sus votaciones.
				</td>
			</tr>
		</tbody>
	</table>
	<p>
		Los datos se obtienen del servicio web público de tramitación del Senado, que entrega la ficha
		de cada boletín en formato XML. Guardamos cada respuesta tal como llega, con la fecha de
		consulta y una huella digital que permite saber si cambió, y a partir de ella armamos la ficha
		que se ve en el sitio. Gracias a eso, cualquier dato publicado se puede rastrear hasta la
		respuesta original de la fuente.
	</p>
	<p>
		Los documentos, en cambio, no se copian: el texto de cada proyecto y de cada ley se abre
		directamente en el sitio oficial. Ninguna de estas instituciones patrocina ni opera el
		Observatorio.
	</p>

	<h3 id="sexo">Sexo de quienes firman</h3>
	<p>
		El Senado entrega a cada autor como un nombre, sin identificador ni sexo. Para saber si un
		proyecto lo firman mujeres, hombres o ambos, enlazamos cada nombre con una persona: primero con
		el servicio de diputados de la Cámara, que informa el sexo; si no figura allí, con las reseñas
		parlamentarias de la Biblioteca del Congreso Nacional, donde el sexo se deriva del texto de la
		reseña («diputada», «senador»); y, para los pocos nombres que ninguna lista identifica, con una
		corrección a mano que declara su origen en el repositorio. El enlace exige que los apellidos
		coincidan por completo y que el nombre sea uno de los nombres de pila de la persona; ante una
		duda no adivinamos, y si todos los candidatos tienen el mismo sexo conservamos el sexo sin
		atribuir la persona.
	</p>
	<p>
		«Solo mujeres», «solo hombres» y «mujeres y hombres» se refieren a quienes firman la moción. No
		dicen nada sobre su contenido, sobre quién la impulsó ni sobre el partido, y los mensajes de la
		Presidencia quedan aparte porque no tienen autoría parlamentaria.
	</p>

	<h2 id="actualizacion">Cómo se actualizan</h2>
	<table>
		<caption class="visualmente-oculto">Procesos de actualización</caption>
		<thead>
			<tr><th scope="col">Proceso</th><th scope="col">Cuándo</th><th scope="col">Qué hace</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>Consulta diaria</td>
				<td>Todos los días, a las 9:00</td>
				<td>
					Pregunta al Senado por los proyectos con movimiento en las últimas tres semanas. La
					ventana es amplia a propósito, porque algunos trámites se registran con días de atraso.
				</td>
			</tr>
			<tr>
				<td>Clasificación de proyectos nuevos</td>
				<td>Todos los días, a las 9:30</td>
				<td>
					Un agente lee los proyectos que ingresaron desde la última consulta, decide si cumplen el
					criterio y, si hay cambios, actualiza el sitio. Si el texto de un proyecto aún no se puede
					leer, espera hasta dos semanas antes de decidir solo con el título.
				</td>
			</tr>
			<tr>
				<td>Revisión completa</td>
				<td>Cada quince días, de madrugada</td>
				<td>
					Vuelve a consultar uno por uno los más de 18.000 boletines desde 1990, para recoger los
					cambios que la consulta diaria no alcanza a ver. Tarda varias horas, porque las consultas
					se espacian para no sobrecargar al Senado.
				</td>
			</tr>
		</tbody>
	</table>
	<p>
		Al terminar cada proceso se genera una nueva copia de los datos para el sitio. El sitio solo lee
		esa copia y nunca consulta a las fuentes en el momento, de modo que, si el Senado no responde,
		sigue mostrando el último dato válido. El pie de cada página indica cuándo fue la última
		consulta exitosa.
	</p>

	<h2 id="limites">Lo que todavía no cubre</h2>
	<ul>
		<li>
			Los proyectos anteriores a 2020 que no llegaron a ser ley se evaluaron solo por su título y
			sus materias, porque las reglas sobre el texto se aplican desde ese año.
		</li>
		<li>
			Los proyectos presentados después del 22 de octubre de 2026 los decide el agente, que puede
			equivocarse y no distingue los matices que una persona detectaría al leer el proyecto
			completo. Los que decidió el agente se vuelven a evaluar cuando se convierten en ley; los de
			la lista inicial, no, aunque el texto final pueda incluir disposiciones de género que el
			proyecto no tenía.
		</li>
		<li>
			El sexo de senadoras y senadores, y de quienes no figuran en el servicio de la Cámara, es un
			dato derivado de una reseña o corregido a mano, no uno que informe una fuente. Unos pocos
			autores se corrigieron a mano según su nombre propio y están pendientes de verificar. Los
			autores siguen apareciendo tal como los escribe el Senado, y todavía no mostramos votaciones.
		</li>
	</ul>

	<h2 id="descarga">Descargar los datos</h2>
	<p>
		Cada búsqueda de <a href="/proyectos">Proyectos</a> se puede bajar como tabla. Debajo del número
		de resultados aparecen los enlaces <strong>CSV</strong>, que se abre en Excel o en cualquier
		planilla, y
		<strong>JSON</strong>, pensado para quien quiera usar los datos desde un programa. Ambos
		respetan los filtros que tengas aplicados y entregan todos los proyectos que cumplen, no solo
		los de la página que estás viendo. Si no filtras nada, bajas la selección completa.
	</p>
	<p>
		Cada fila es un proyecto, con su boletín, título, fecha de ingreso, tipo de iniciativa, cámara
		de origen, estado, etapa, número de ley, fecha de publicación en el Diario Oficial, fecha del
		último trámite, autores, autoría según el sexo de quienes firman y temas, además de un enlace a
		su ficha. Los autores y los temas vienen separados por punto y coma. Los datos provienen de
		fuentes públicas oficiales y se actualizan con la frecuencia descrita arriba; la fecha de la
		última consulta aparece al pie de cada página.
	</p>

	<h2 id="correcciones">Código, datos y correcciones</h2>
	<p>
		El código es abierto, con licencia AGPL-3.0, y está publicado en
		<a href="https://github.com/pedroaravenam/observatorio-legislacion-genero">GitHub</a> junto con
		la lista de proyectos seleccionados y la señal que incluyó a cada uno. Si encuentras un proyecto
		que debería estar y no está, o uno que está de más, puedes avisarnos allí o escribir a
		<a href="mailto:{CONTACTO}">{CONTACTO}</a>, y lo revisaremos con este mismo criterio.
	</p>

	<h2 id="quien">Quién hace este sitio</h2>
	<div class="autoria-ancha"><Autoria /></div>
</article>

<style>
	.texto > :global(*) {
		max-width: 46rem;
	}
	.texto > table,
	.texto > .temas {
		max-width: 56rem;
	}
	.texto > .autoria-ancha {
		max-width: 64rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2rem, 5vw, 3rem);
		line-height: 1.1;
		margin: 2rem 0 1rem;
	}
	.entrada {
		font-size: 1.12rem;
		color: var(--tinta-suave);
	}
	.indice {
		margin: 1.5rem 0 0;
		padding: 0.9rem 1.2rem;
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
	}
	.indice ol {
		margin: 0;
		padding-left: 1.3rem;
		columns: 2 16rem;
		column-gap: 2rem;
	}
	.indice a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.5rem;
		margin-top: 2.75rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--borde);
		scroll-margin-top: 1rem;
	}
	h3 {
		font-size: 1.05rem;
		margin: 0 0 0.3rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}
	th,
	td {
		text-align: left;
		vertical-align: top;
		padding: 0.7rem 0.9rem 0.7rem 0;
		border-bottom: 1px solid var(--borde);
	}
	th {
		font-size: 0.88rem;
		color: var(--tinta-suave);
		font-weight: 600;
	}
	td:first-child {
		font-weight: 600;
		width: 26%;
	}
	@media (max-width: 40rem) {
		thead {
			display: none;
		}
		tr {
			display: block;
			padding: 0.8rem 0;
			border-bottom: 1px solid var(--borde);
		}
		td {
			display: block;
			border: 0;
			padding: 0.15rem 0;
		}
		td:first-child {
			width: auto;
		}
	}
	.pasos-metodo {
		list-style: none;
		counter-reset: paso;
		padding: 0;
		margin: 1.5rem 0;
	}
	.pasos-metodo li {
		counter-increment: paso;
		position: relative;
		padding: 0 0 1.4rem 2.25rem;
		border-left: 2px solid var(--borde);
		margin-left: 1rem;
	}
	.pasos-metodo li:last-child {
		border-left-color: transparent;
		padding-bottom: 0;
	}
	.pasos-metodo li::before {
		content: counter(paso);
		position: absolute;
		left: calc(-1rem - 1px);
		top: -0.15rem;
		width: 2rem;
		height: 2rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--violeta);
		color: var(--sobre-violeta);
		font-weight: 700;
		font-size: 0.95rem;
	}
	.pasos-metodo p {
		margin: 0;
	}
	.temas {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
		gap: 0.5rem 1.5rem;
	}
	.temas div {
		padding: 0.6rem 0;
		border-top: 2px solid var(--violeta-suave);
	}
	.temas dt {
		font-weight: 600;
	}
	.temas dt a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.temas dd {
		margin: 0;
		color: var(--tinta-suave);
		font-size: 0.95rem;
	}
	ul li {
		margin-bottom: 0.5rem;
	}
</style>
