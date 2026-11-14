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
		cuatro niveles según qué tan estrecha es su relación con el género. Los tres primeros forman
		parte de la selección y el cuarto queda fuera. Cuando existe una duda razonable sobre si el
		contenido es de género, el proyecto entra, pero marcado como relación débil, de modo que quien
		consulta sabe que el vínculo es menos claro. Distinto es el caso en que la duda la tiene el
		agente, que es el programa de inteligencia artificial que aplica este criterio a los proyectos.
		Entonces la decisión no se publica hasta que la revisa el desarrollador, como explicamos más
		abajo.
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
					criterio. Ocurre, por ejemplo, cuando el efecto sobre las mujeres solo se deduce del
					contexto o cuando la materia es vecina al género, como un homenaje a las mujeres como
					grupo. Sin embargo, un artículo aislado en un proyecto que trata de otra cosa no basta. El
					proyecto entra a la selección, marcado como relación débil.
				</td>
				<td>
					Ley general contra la discriminación, un monumento a las mujeres de la Guerra del
					Pacífico, cláusulas que discriminan a personas con VIH.
				</td>
			</tr>
			<tr>
				<td>Queda fuera</td>
				<td>
					Los términos aparecen solo de paso, como ocurre con “género” en el sentido de mercadería,
					con mujeres nombradas en una lista de beneficiarios sin un trato distinto o con el sexo
					mencionado dentro de una cláusula genérica de no discriminación.
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
		Dado que no es posible aplicar ese criterio a mano sobre más de 18.000 proyectos, la mayor parte
		de la selección proviene de una lista que se armó en octubre de 2026 con reglas automáticas.
		Desde entonces trabaja además un agente, es decir, un modelo de lenguaje de inteligencia
		artificial (Claude, de Anthropic) que lee cada proyecto siguiendo unas instrucciones escritas a
		partir de este criterio. El agente decide sobre los proyectos que van ingresando al Congreso y,
		en paralelo, vuelve a revisar gradualmente los que ya estaban en la lista. Cuando no está seguro
		de su decisión, la toma el desarrollador del sitio, de modo que ningún caso dudoso se publica
		sin una lectura humana. Las instrucciones del agente están publicadas completas en
		<a
			href="https://github.com/pedroaravenam/observatorio-legislacion-genero/blob/main/despliegue/clasificador/criterio.md"
			>el repositorio</a
		>, por lo que cualquier persona puede revisar con qué indicaciones trabaja.
	</p>
	<p>
		Lo primero que se pregunta sobre cada proyecto es qué regula, y solo después se mira el
		vocabulario que usa. Por esa razón, un proyecto que concede la nacionalidad por gracia, regula
		el cuidado de animales de compañía, crea un feriado o cambia un tributo queda fuera, aunque sus
		fundamentos hablen de mujeres o de madres y aunque tenga un artículo suelto que roce el tema. A
		ello se suma que algunas palabras inducen a error. La palabra “cuidado” puede referirse a una
		mascota, y términos como “protección” o “igualitario” no siempre tienen que ver con diferencias
		entre mujeres y hombres. En consecuencia, cuando aparecen se lee el texto para comprobar en qué
		sentido se usan.
	</p>
	<p>
		Al revisar casos difíciles, el desarrollador ha ido fijando reglas para que el agente resuelva
		del mismo modo los proyectos parecidos. Quedan fuera, por ejemplo, los proyectos que tratan solo
		de infancia, de discapacidad o de reforma política, aunque sus fundamentos nombren a las
		mujeres. Lo mismo ocurre con la materia penal general, como las rebajas de condena para una
		lista de delitos graves, aun cuando esa lista incluya delitos sexuales. Los proyectos sobre
		delitos sexuales sí entran, salvo los que tratan de delitos cometidos contra menores de edad,
		que se consideran un asunto penal y de infancia antes que de género. Del mismo modo, el embarazo
		por sí solo no basta, mientras que la maternidad y los derechos que se derivan de ella sí forman
		parte de la selección. Por último, los permisos o seguros para acompañar a hijos enfermos entran
		como un componente de género aunque su texto no nombre a las mujeres, dado que ese cuidado recae
		sobre todo en ellas.
	</p>
	<p>
		Cada proyecto de la selección muestra en su ficha la vía por la que entró. Hay tres vías, que
		corresponden a los tres momentos por los que ha pasado el método.
	</p>
	<ol class="pasos-metodo">
		<li>
			<h3>La lista original</h3>
			<p>
				La primera selección, del 22 de octubre de 2026, se hizo con reglas que buscaban en cada
				proyecto los términos de un léxico de género, es decir, una lista de palabras y expresiones
				asociadas a estos temas, como “femicidio”, “sala cuna” o “identidad de género”. Por
				encontrarlos en su título entraron {n('T1_titulo_estricto', 'T2_titulo_medio')} proyectos. Otros
				{n('T3_cuerpo_firme', 'T4_cuerpo_amplio', 'V2_conteo_absoluto', 'V_validado_densidad_baja')} entraron
				por la frecuencia con que esos términos aparecían en el texto del proyecto, una medición que solo
				se hizo en los presentados desde 2020. Sin embargo, en un texto muy largo unos pocos términos
				dan una frecuencia baja aunque el tema esté presente, por lo que esos casos, como los tratados
				comerciales, se leyeron uno a uno. A ellos se suman {n('T5_materias')} proyectos que entraron
				por las materias que les asignó el Senado y {n('L_texto_ley_fuera')} que entraron por el texto
				de la ley publicada, el cual se leyó con apoyo de un modelo de lenguaje (Claude Sonnet 5.5, de
				Anthropic). Al final se retiraron los proyectos que ya se sabía que habían entrado por error,
				como los reajustes de remuneraciones del sector público.
			</p>
			<p>
				Esas reglas contaban palabras, y una palabra no siempre indica el tema de un proyecto. Un
				proyecto sobre los derechos de la Madre Tierra, por ejemplo, podía entrar por la palabra
				“madre”. Por eso la lista original se está revisando de nuevo con el criterio actual.
			</p>
		</li>
		<li>
			<h3>Proyectos nuevos y repaso de lo anterior</h3>
			<p>
				Desde el 22 de octubre de 2026, los proyectos que ingresan los lee el agente. Para cada uno
				recibe el título, las materias que le asignó el Senado y el texto del proyecto, junto con
				los pasajes donde aparecen términos del léxico. Esos términos, sin embargo, solo le sirven
				una vez que ha fijado de qué trata el proyecto, de modo que no reemplazan la lectura. Con
				esa información decide en cuál de los cuatro niveles queda el proyecto y deja una
				explicación breve, que se muestra en la ficha junto con su nivel de confianza. Ese nivel
				indica si el criterio se cumple o no con claridad (confianza alta), si hay una duda
				razonable (media) o si la información disponible es escasa o ambigua (baja). Por esta vía se
				incluyeron
				{n('A1_agente_tema_central', 'A2_agente_componente', 'A3_agente_debil')} proyectos.
			</p>
			<p>
				Cada noche, además, el agente vuelve a revisar un grupo de proyectos, formado por los que
				decidió con una versión anterior del criterio y por algunos de la lista original elegidos al
				azar. Si con el criterio actual la decisión es otra, la selección cambia en consecuencia. A
				ello se suma un resguardo para cuando el criterio se modifica. Antes de seguir trabajando,
				el agente debe resolver correctamente un conjunto de casos de control, que son proyectos
				cuya respuesta correcta ya está establecida, lo que permite detectar si el cambio alteró
				decisiones que estaban bien tomadas.
			</p>
		</li>
		<li>
			<h3>Casos dudosos</h3>
			<p>
				Desde el 13 de noviembre de 2026, los casos en que el agente duda no se publican con su
				decisión. Se trata de los proyectos que incluye con relación débil sin estar del todo seguro
				y de los que deja fuera sin una confianza alta, es decir, de aquellos en que el propio
				agente reconoce que la decisión puede ser otra. Esos proyectos esperan a que el
				desarrollador los lea y decida. Su decisión queda registrada como manual, junto con la razón
				que la justifica, y el agente la recibe como precedente, es decir, como un ejemplo ya
				resuelto que debe tener en cuenta cuando le toca un proyecto parecido. De este modo, el
				mismo razonamiento se aplica a casos semejantes. Por decisión del desarrollador se
				incluyeron {n('M_decision_manual')} proyectos.
			</p>
		</li>
	</ol>
	<p>
		El resultado es una selección de {total} proyectos, que es lo único que muestra el Observatorio. Por
		lo tanto, un proyecto que no cumple el criterio no aparece en las búsquedas ni tiene ficha aquí, aunque
		sí puedes encontrarlo en el sitio del Senado.
	</p>
	<p>
		Para comprobar que las reglas de la lista original no dejaban fuera demasiados casos, leímos una
		muestra de 100 leyes que no contenían ningún término del léxico, y ninguna resultó ser de
		género. A partir de ese resultado podemos afirmar, con un 95 % de confianza estadística, que
		menos del 3 % de las leyes sin términos del léxico trata temas de género.
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
		reseña (“diputada”, “senador”); y, para los pocos nombres que ninguna lista identifica, con una
		corrección a mano que declara su origen en el repositorio. El enlace exige que los apellidos
		coincidan por completo y que el nombre sea uno de los nombres de pila de la persona; ante una
		duda no adivinamos, y si todos los candidatos tienen el mismo sexo conservamos el sexo sin
		atribuir la persona.
	</p>
	<p>
		“Solo mujeres”, “solo hombres” y “mujeres y hombres” se refieren a quienes firman la moción. No
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
					El agente lee los proyectos que ingresaron desde la última consulta, decide si cumplen el
					criterio y, si hay cambios, actualiza el sitio. Cuando el texto de un proyecto aún no está
					disponible, espera hasta dos semanas antes de decidir solo con el título, porque el título
					por sí solo dice menos sobre el contenido. Los casos dudosos esperan la revisión del
					desarrollador.
				</td>
			</tr>
			<tr>
				<td>Repaso con el criterio vigente</td>
				<td>Todas las noches, a las 3:00</td>
				<td>
					El agente vuelve a revisar una tanda de proyectos decididos con una versión anterior del
					criterio y una muestra al azar de la lista original, y actualiza el sitio si alguna
					decisión cambia.
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
			La lista original todavía no se repasa completa con el criterio actual. Hasta que eso termine,
			puede haber proyectos que entraron por una palabra y que hoy quedarían fuera, y otros que
			quedaron fuera y que hoy entrarían. En esa lista, los proyectos anteriores a 2020 que no
			llegaron a ser ley se evaluaron solo por su título y sus materias, porque las reglas sobre el
			texto se aplicaron desde ese año.
		</li>
		<li>
			El agente puede equivocarse y no siempre distingue los matices que una persona detectaría al
			leer el proyecto completo. Las decisiones que toma con seguridad se publican sin que nadie las
			lea antes, y solo los casos en que duda pasan por el desarrollador. Además, los proyectos que
			decidió el agente se vuelven a evaluar cuando se convierten en ley, pero los de la lista
			original no, aunque el texto final pueda incluir disposiciones de género que el proyecto no
			tenía.
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
		Cada búsqueda de <a href="/proyectos">Proyectos</a> se puede bajar como tabla. Debajo del número de
		resultados aparecen los enlaces CSV, que se abre en Excel o en cualquier planilla, y JSON, pensado
		para quien quiera usar los datos desde un programa. Ambos respetan los filtros que tengas aplicados
		y entregan todos los proyectos que cumplen, no solo los de la página que estás viendo. Si no filtras
		nada, bajas la selección completa.
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
		la lista de proyectos seleccionados y la vía por la que entró cada uno. Si encuentras un
		proyecto que debería estar y no está, o uno que está de más, puedes avisarnos allí o escribir a
		<a href="mailto:{CONTACTO}">{CONTACTO}</a>, y lo revisaremos con este mismo criterio. El
		criterio lo decide el desarrollador del sitio, y las reglas que va fijando se suman a las
		instrucciones publicadas del agente, de modo que también se pueden discutir.
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
