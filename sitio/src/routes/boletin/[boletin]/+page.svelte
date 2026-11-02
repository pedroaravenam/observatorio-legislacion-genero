<script lang="ts">
	import {
		etiquetaSenal,
		fechaCorta,
		fechaHoraChile,
		fechaLarga,
		numeroLey,
		urlFichaSenado,
		urlLeyBcn
	} from '#lib/formato';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.proyecto);
	const ley = $derived(numeroLey(p.ley_numero));
	const tramites = $derived([...p.tramites].reverse());
</script>

<svelte:head>
	<title>Boletín {p.boletin} · Observatorio de Legislación de Género</title>
	<meta name="description" content={p.titulo.slice(0, 300)} />
</svelte:head>

<p class="volver"><a href="/">← Volver a los proyectos</a></p>

<article>
	<header>
		<p class="meta">
			<span class="boletin">Boletín {p.boletin}</span>
			{#if p.estado}<span
					class="etiqueta"
					class:publicado={p.estado === 'Publicado'}
					class:tramitacion={p.estado === 'En tramitación'}>{p.estado}</span
				>{/if}
			{#if p.genero}<span class="etiqueta genero">Selección de género (preliminar)</span>{/if}
		</p>
		<h1>{p.titulo}</h1>
	</header>

	<section aria-labelledby="fuentes-titulo" class="fuentes">
		<h2 id="fuentes-titulo" class="visualmente-oculto">Documentos en la fuente oficial</h2>
		<div class="botones">
			<a class="boton" href={urlFichaSenado(p.boletin)} rel="external noopener" target="_blank">
				Tramitación completa en el Senado<span class="visualmente-oculto">
					(abre en otra pestaña)</span
				>
			</a>
			{#if p.url_documento}
				<a class="boton secundario" href={p.url_documento} rel="external noopener" target="_blank">
					Texto del {p.iniciativa === 'Mensaje' ? 'mensaje' : 'proyecto'} original<span
						class="visualmente-oculto"
					>
						(descarga desde el Senado, abre en otra pestaña)</span
					>
				</a>
			{/if}
			{#if ley}
				<a class="boton secundario" href={urlLeyBcn(ley)} rel="external noopener" target="_blank">
					Texto de la ley {ley.toLocaleString('es-CL')} en la BCN<span class="visualmente-oculto">
						(abre en otra pestaña)</span
					>
				</a>
			{/if}
		</div>
		<p class="nota">
			Los documentos completos se abren en el sitio oficial. Si no cargan, la fuente puede estar
			temporalmente fuera de servicio; intenta de nuevo en unos minutos.
		</p>
	</section>

	<section aria-labelledby="datos-titulo">
		<h2 id="datos-titulo">Datos del proyecto</h2>
		<dl class="datos">
			{#if p.fecha_ingreso}<div>
					<dt>Ingreso</dt>
					<dd>{fechaLarga(p.fecha_ingreso)}</dd>
				</div>{/if}
			{#if p.iniciativa}<div>
					<dt>Origen</dt>
					<dd>
						{p.iniciativa === 'Mensaje'
							? 'Mensaje (Presidencia de la República)'
							: 'Moción (parlamentarios)'}
					</dd>
				</div>{/if}
			{#if p.camara_origen}<div>
					<dt>Cámara de origen</dt>
					<dd>{p.camara_origen}</dd>
				</div>{/if}
			{#if p.etapa}<div>
					<dt>Etapa</dt>
					<dd>
						{p.etapa}{#if p.subetapa}<br /><span class="suave">{p.subetapa}</span>{/if}
					</dd>
				</div>{/if}
			{#if p.urgencia}<div>
					<dt>Urgencia</dt>
					<dd>{p.urgencia}</dd>
				</div>{/if}
			{#if p.ley_numero}<div>
					<dt>Resultado</dt>
					<dd>
						{p.ley_numero}{#if p.diario_oficial}, publicada el {fechaLarga(p.diario_oficial)}{/if}
					</dd>
				</div>{/if}
		</dl>
	</section>

	{#if p.genero && p.nivel_senal}
		<aside class="aviso" aria-labelledby="seleccion-titulo">
			<h2 id="seleccion-titulo">Por qué aparece en la selección de género</h2>
			<p>
				{etiquetaSenal(p.nivel_senal)}. Es una selección automática preliminar ({p.version_seleccion}),
				no una clasificación validada. <a href="/acerca#seleccion">Cómo se selecciona</a>.
			</p>
		</aside>
	{/if}

	{#if p.autores.length || p.materias.length}
		<div class="dos">
			{#if p.autores.length}
				<section aria-labelledby="autores-titulo">
					<h2 id="autores-titulo">Autores</h2>
					<ul class="nombres">
						{#each p.autores as a (a)}<li>{a}</li>{/each}
					</ul>
				</section>
			{/if}
			{#if p.materias.length}
				<section aria-labelledby="materias-titulo">
					<h2 id="materias-titulo">Materias</h2>
					<ul class="materias">
						{#each p.materias as m (m)}<li class="etiqueta">
								{m.toLocaleLowerCase('es-CL')}
							</li>{/each}
					</ul>
				</section>
			{/if}
		</div>
	{/if}

	<section aria-labelledby="tramites-titulo">
		<h2 id="tramites-titulo">
			Tramitación <span class="suave"
				>({tramites.length}
				{tramites.length === 1 ? 'trámite' : 'trámites'}, el más reciente primero)</span
			>
		</h2>
		{#if tramites.length === 0}
			<p>El Senado no informa trámites para este boletín.</p>
		{:else}
			<ol class="tramites">
				{#each tramites as [fecha, sesion, descripcion, etapa, camara], i (i)}
					<li>
						<p class="t-fecha">
							<strong>{fechaCorta(fecha) ?? 'Sin fecha'}</strong>
							{#if camara}· {camara}{/if}
							{#if sesion}· sesión {sesion}{/if}
						</p>
						<p class="t-desc">{descripcion}</p>
						{#if etapa}<p class="t-etapa">{etapa}</p>{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<p class="procedencia">
		Fuente: Senado de la República, servicio de tramitación. Última vez que el Observatorio registró
		un cambio en esta ficha: {fechaHoraChile(p.actualizado) ?? 'sin dato'}.
	</p>
</article>

<style>
	.volver {
		margin: 0 0 1rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.6rem;
		align-items: center;
		margin: 0;
	}
	.boletin {
		font-weight: 600;
		color: var(--texto-suave);
		font-variant-numeric: tabular-nums;
	}
	h1 {
		font-size: clamp(1.35rem, 3.4vw, 1.9rem);
		margin: 0.5rem 0 1.25rem;
		overflow-wrap: anywhere;
	}
	h2 {
		font-size: 1.2rem;
		margin: 2rem 0 0.75rem;
	}
	.suave {
		color: var(--texto-suave);
		font-weight: 400;
		font-size: 0.95rem;
	}
	.botones {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.nota {
		font-size: 0.9rem;
		color: var(--texto-suave);
		margin: 0.6rem 0 0;
	}
	.datos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 0.9rem 1.5rem;
		margin: 0;
	}
	.datos dt {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--texto-suave);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.datos dd {
		margin: 0.15rem 0 0;
	}
	.aviso {
		margin-top: 2rem;
	}
	.aviso h2 {
		margin: 0 0 0.3rem;
		font-size: 1.05rem;
	}
	.aviso p {
		margin: 0;
	}
	.dos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: 0 2rem;
	}
	.nombres {
		margin: 0;
		padding-left: 1.2rem;
	}
	.materias {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.materias .etiqueta {
		white-space: normal;
		font-weight: 500;
	}
	.tramites {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 2px solid var(--borde);
	}
	.tramites li {
		position: relative;
		padding: 0 0 1rem 1.1rem;
	}
	.tramites li::before {
		content: '';
		position: absolute;
		left: -6px;
		top: 0.45rem;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--acento);
	}
	.tramites p {
		margin: 0;
	}
	.t-fecha {
		font-size: 0.92rem;
		font-variant-numeric: tabular-nums;
	}
	.t-desc {
		overflow-wrap: anywhere;
	}
	.t-etapa {
		font-size: 0.88rem;
		color: var(--texto-suave);
	}
	.procedencia {
		margin-top: 2rem;
		font-size: 0.9rem;
		color: var(--texto-suave);
	}
</style>
