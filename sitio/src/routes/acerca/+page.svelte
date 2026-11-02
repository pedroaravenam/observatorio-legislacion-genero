<svelte:head>
	<title>Cómo funciona · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Fuentes, actualización y criterio de selección del Observatorio de Legislación de Género."
	/>
</svelte:head>

<article class="texto">
	<h1>Cómo funciona</h1>

	<p>
		El Observatorio reúne los proyectos de ley presentados en Chile desde 1990 y permite seguir los
		que se relacionan con género. Cada ficha enlaza al documento oficial, de modo que cualquier dato
		se puede verificar en su origen.
	</p>

	<h2>Fuentes</h2>
	<table>
		<caption class="visualmente-oculto">Fuentes de datos del Observatorio</caption>
		<thead>
			<tr><th scope="col">Fuente</th><th scope="col">Qué aporta</th></tr>
		</thead>
		<tbody>
			<tr
				><td>Senado de la República</td><td
					>Título, estado, etapa, autores, materias y tramitación en ambas cámaras, más el enlace al
					texto original del proyecto.</td
				></tr
			>
			<tr
				><td>Biblioteca del Congreso Nacional</td><td
					>Texto de las leyes publicadas, al que se enlaza desde cada ficha.</td
				></tr
			>
			<tr
				><td>Cámara de Diputadas y Diputados</td><td
					>Información complementaria sobre proyectos y autores, en incorporación.</td
				></tr
			>
		</tbody>
	</table>
	<p>Ninguna de estas instituciones patrocina ni opera este sitio.</p>

	<h2>Actualización</h2>
	<p>
		Todos los días se consulta al Senado por los proyectos con movimiento en las últimas semanas, y
		cada quince días se revisa el catálogo completo para recoger cambios que se registraron tarde.
		El pie de cada página indica la fecha de la última consulta exitosa. Si una fuente no responde,
		el sitio sigue mostrando el último dato válido.
	</p>
	<p>
		Los documentos completos no se copian: se abren desde la fuente oficial. Si una fuente está
		fuera de servicio, el documento no estará disponible hasta que vuelva.
	</p>

	<h2 id="seleccion">Selección de género (preliminar)</h2>
	<p>
		La selección se hace con reglas automáticas y públicas sobre el título, las materias asignadas
		por el Senado, el texto del proyecto y el texto de la ley resultante. Cada proyecto seleccionado
		indica qué señal lo incluyó.
	</p>
	<p class="aviso">
		<strong>Es una selección preliminar.</strong> Todavía no ha sido validada caso a caso, de modo que
		puede incluir proyectos que no corresponden y omitir otros que sí. Por eso el sitio permite buscar
		en todos los proyectos.
	</p>

	<h2>Código y datos</h2>
	<p>
		El código es abierto, con licencia AGPL-3.0, y está en
		<a href="https://github.com/pedroaravenam/observatorio-legislacion-genero">GitHub</a>. Allí
		también se pueden informar errores.
	</p>
</article>

<style>
	.texto {
		max-width: 46rem;
	}
	h1 {
		font-size: clamp(1.6rem, 4vw, 2.2rem);
		margin-top: 0;
	}
	h2 {
		margin-top: 2rem;
		font-size: 1.25rem;
		scroll-margin-top: 1rem;
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
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid var(--borde);
	}
	th {
		color: var(--texto-suave);
	}
	td:first-child {
		font-weight: 600;
		width: 34%;
	}
</style>
