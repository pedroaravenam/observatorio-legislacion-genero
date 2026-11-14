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
		cuarto queda fuera. Ante una duda razonable sobre si el contenido es de género, el proyecto
		entra, marcado como relación débil. Si quien duda es el agente que aplica el criterio, el
		proyecto espera la revisión del desarrollador, como explicamos más abajo.
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
					criterio: un efecto sobre las mujeres que solo se deduce del contexto, o una materia
					vecina, como un homenaje a las mujeres como grupo. Un artículo aislado en un proyecto que
					trata de otra cosa no basta. Entra a la selección, marcado como relación débil.
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
		Aplicar ese criterio a mano sobre más de 18.000 proyectos no es posible. El grueso de la
		selección viene de una lista armada con reglas automáticas en octubre de 2026. Desde entonces,
		un agente, es decir, un modelo de lenguaje que lee cada proyecto con instrucciones escritas a
		partir de este criterio, decide sobre los proyectos nuevos y repasa de a poco los anteriores.
		Cuando el agente duda, decide el desarrollador del sitio. Las instrucciones del agente están
		publicadas completas en
		<a
			href="https://github.com/pedroaravenam/observatorio-legislacion-genero/blob/main/despliegue/clasificador/criterio.md"
			>el repositorio</a
		>.
	</p>
	<p>
		Lo primero que se pregunta sobre cada proyecto es qué regula, y solo después se mira el
		vocabulario. Un proyecto que concede la nacionalidad por gracia, regula el cuidado de animales
		de compañía, crea un feriado o cambia un tributo queda fuera, aunque sus fundamentos hablen de
		mujeres o de madres y aunque tenga un artículo suelto que roce el tema. Hay palabras que
		engañan: «cuidado» puede referirse a una mascota, y «protección» o «igualitario» no siempre
		tienen que ver con diferencias entre mujeres y hombres. En esos casos se lee el texto para
		comprobar en qué sentido se usan.
	</p>
	<p>
		Al revisar casos difíciles, el desarrollador ha ido fijando reglas que el agente aplica a los
		proyectos parecidos. Quedan fuera, por ejemplo, los que tratan solo de infancia, de
		discapacidad, de materia penal general o de reforma política, aunque sus fundamentos nombren a
		las mujeres. Los delitos sexuales entran; los cometidos contra menores de edad, en cambio, se
		consideran un asunto penal y de infancia, no de género. El embarazo por sí solo tampoco basta,
		aunque sí entran la maternidad y los derechos que se derivan de ella. Y los permisos o seguros
		para acompañar a hijos enfermos entran como un componente de género aunque su texto no nombre a
		las mujeres, porque ese cuidado recae sobre todo en ellas.
	</p>
	<p>
		Cada proyecto de la selección muestra en su ficha la vía por la que entró. Son tres, que
		corresponden a tres momentos del método.
	</p>
	<ol class="pasos-metodo">
		<li>
			<h3>La lista original</h3>
			<p>
				La primera selección, del 22 de octubre de 2026, se hizo con reglas que buscaban los
				términos de un léxico de género, como «femicidio», «sala cuna» o «identidad de género». Por
				su título entraron <strong>{n('T1_titulo_estricto', 'T2_titulo_medio')}</strong> proyectos.
				Por la frecuencia de esos términos en el texto del proyecto, que se midió solo en los
				presentados desde 2020, entraron
				<strong
					>{n(
						'T3_cuerpo_firme',
						'T4_cuerpo_amplio',
						'V2_conteo_absoluto',
						'V_validado_densidad_baja'
					)}</strong
				>; los textos muy largos con pocos términos, como los tratados comerciales, se leyeron uno a
				uno. Otros <strong>{n('T5_materias')}</strong> entraron por las materias que les asignó el
				Senado, y <strong>{n('L_texto_ley_fuera')}</strong> por el texto de la ley publicada, que se leyó
				con apoyo de un modelo de lenguaje. Al final se retiraron falsos positivos conocidos, como los
				reajustes de remuneraciones del sector público.
			</p>
			<p>
				Esas reglas contaban palabras, y una palabra no siempre indica el tema: un proyecto sobre
				los derechos de la Madre Tierra podía entrar por «madre». Por eso la lista original se está
				repasando con el criterio actual.
			</p>
		</li>
		<li>
			<h3>Proyectos nuevos y repaso de lo anterior</h3>
			<p>
				Desde el 22 de octubre de 2026, los proyectos que ingresan los lee el agente. Recibe el
				título, las materias del Senado y el texto del proyecto con los pasajes donde aparecen
				términos del léxico, pero esos términos solo le sirven después de fijar de qué trata el
				proyecto. Decide en cuál de los cuatro niveles queda y deja una explicación breve con su
				nivel de confianza, que se muestra en la ficha. Por esta vía se incluyeron
				<strong>{n('A1_agente_tema_central', 'A2_agente_componente', 'A3_agente_debil')}</strong> proyectos.
			</p>
			<p>
				Cada noche, además, el agente vuelve a revisar una tanda de proyectos: los que decidió con
				una versión anterior del criterio y algunos de la lista original, elegidos al azar. Si con
				el criterio actual la decisión es otra, la selección cambia. Y cada vez que el criterio
				cambia, el agente tiene que resolver bien un conjunto de casos de control antes de seguir.
			</p>
		</li>
		<li>
			<h3>Casos dudosos</h3>
			<p>
				Desde el 13 de noviembre de 2026, los casos en que el agente duda no se publican con su
				decisión. Son los que incluye con relación débil sin estar del todo seguro y los que deja
				fuera sin una confianza alta. Esos proyectos esperan a que el desarrollador los lea y
				decida. Su decisión queda registrada como manual, con la razón, y el agente la recibe como
				precedente cuando le toca un proyecto parecido. Por decisión del desarrollador se incluyeron
				<strong>{n('M_decision_manual')}</strong> proyectos.
			</p>
		</li>
	</ol>
	<p>
		El resultado es una selección de <strong>{total}</strong> proyectos, que es lo único que muestra el
		Observatorio. Un proyecto que no cumple el criterio no aparece en las búsquedas ni tiene ficha aquí,
		aunque sí puedes encontrarlo en el sitio del Senado.
	</p>
	<p>
		Para comprobar que las reglas de la lista original no dejaban fuera demasiados casos, leímos una
		muestra de 100 leyes que no contenían ningún término del léxico, y ninguna resultó ser de
		género. Con ese resultado podemos afirmar, con un 95 % de confianza, que menos del 3 % de las
		leyes sin términos del léxico trata temas de género.
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
					leer, espera hasta dos semanas antes de decidir solo con el título. Los casos dudosos
					esperan la revisión del desarrollador.
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
			lea antes; solo los casos en que duda pasan por el desarrollador. Los que decidió el agente se
			vuelven a evaluar cuando se convierten en ley; los de la lista original, no, aunque el texto
			final pueda incluir disposiciones de género que el proyecto no tenía.
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
