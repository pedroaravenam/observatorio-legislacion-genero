<script lang="ts">
	import { fechaCorta } from '#lib/formato';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const f = $derived(data.filtros);
	const hayFiltros = $derived(
		Boolean(f.texto || f.anno || f.estado || f.iniciativa || !f.soloGenero)
	);

	function enlacePagina(n: number, todos = !f.soloGenero): string {
		const p = new URLSearchParams();
		if (f.texto) p.set('q', f.texto);
		if (f.anno) p.set('anno', String(f.anno));
		if (f.estado) p.set('estado', f.estado);
		if (f.iniciativa) p.set('iniciativa', f.iniciativa);
		if (todos) p.set('alcance', 'todos');
		if (n > 1) p.set('pagina', String(n));
		const s = p.toString();
		return s ? `/?${s}` : '/';
	}

	function claseEstado(estado: string | null): string {
		if (estado === 'Publicado') return 'publicado';
		if (estado === 'En tramitación') return 'tramitacion';
		return '';
	}

	const numero = new Intl.NumberFormat('es-CL');
</script>

<svelte:head>
	<title>{f.texto ? `«${f.texto}» · ` : ''}Proyectos · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Busca proyectos de ley relacionados con género en Chile, con su tramitación y enlace a la fuente oficial."
	/>
</svelte:head>

<h1>Proyectos de ley</h1>
<p class="intro">
	Proyectos presentados desde 1990, con su tramitación según el Senado. Por defecto se muestran los
	que una selección automática <strong>preliminar</strong> relaciona con género;
	<a href="/acerca#seleccion">ver cómo se seleccionan</a>.
</p>

<form method="GET" action="/" class="filtros" role="search" aria-label="Buscar proyectos">
	<div class="campo ancho">
		<label for="q">Buscar <span class="opcional">(opcional)</span></label>
		<input
			id="q"
			name="q"
			type="search"
			value={f.texto}
			maxlength="200"
			placeholder="Palabras del título, materia, autor o número de boletín"
			aria-describedby="q-ayuda"
		/>
		<span id="q-ayuda" class="ayuda">Ejemplos: «violencia mujer», «sala cuna», «11077-07».</span>
	</div>

	<div class="campo">
		<label for="anno">Año de ingreso</label>
		<select id="anno" name="anno">
			<option value="">Todos</option>
			{#each data.opciones.annos as a (a)}
				<option value={a} selected={f.anno === a}>{a}</option>
			{/each}
		</select>
	</div>

	<div class="campo">
		<label for="estado">Estado</label>
		<select id="estado" name="estado">
			<option value="">Todos</option>
			{#each data.opciones.estados as e (e)}
				<option value={e} selected={f.estado === e}>{e}</option>
			{/each}
		</select>
	</div>

	<div class="campo">
		<label for="iniciativa">Origen</label>
		<select id="iniciativa" name="iniciativa">
			<option value="">Todos</option>
			{#each data.opciones.iniciativas as i (i)}
				<option value={i} selected={f.iniciativa === i}>
					{i === 'Mensaje' ? 'Mensaje (Presidencia)' : 'Moción (parlamentarios)'}
				</option>
			{/each}
		</select>
	</div>

	<fieldset class="campo alcance">
		<legend>Mostrar</legend>
		<label class="opcion">
			<input type="radio" name="alcance" value="genero" checked={f.soloGenero} />
			Selección de género (preliminar)
		</label>
		<label class="opcion">
			<input type="radio" name="alcance" value="todos" checked={!f.soloGenero} />
			Todos los proyectos
		</label>
	</fieldset>

	<div class="acciones">
		<button class="boton" type="submit">Buscar</button>
		{#if hayFiltros}
			<a class="boton secundario" href="/">Limpiar filtros</a>
		{/if}
	</div>
</form>

<p class="resumen" role="status">
	{#if data.total === 0}
		Sin resultados.
	{:else}
		{numero.format(data.total)}
		{data.total === 1 ? 'proyecto' : 'proyectos'}{data.paginas > 1
			? ` · página ${f.pagina} de ${numero.format(data.paginas)}`
			: ''}
	{/if}
</p>

{#if data.total === 0}
	<div class="vacio">
		<h2>No encontramos proyectos con esos criterios</h2>
		<ul>
			{#if f.soloGenero && !data.porNumero}
				<li>
					La búsqueda se limitó a la selección de género.
					<a href={enlacePagina(1, true)}> Buscar en todos los proyectos </a>.
				</li>
			{/if}
			<li>Prueba con menos palabras o sin acentos.</li>
			<li>Si buscas un boletín, escríbelo con su guion, por ejemplo 11077-07.</li>
		</ul>
	</div>
{:else}
	<ol class="lista">
		{#each data.filas as p (p.boletin)}
			<li class="tarjeta">
				<div class="meta">
					<span class="boletin">Boletín {p.boletin}</span>
					{#if p.estado}<span class="etiqueta {claseEstado(p.estado)}">{p.estado}</span>{/if}
					{#if p.genero}<span class="etiqueta genero">Selección de género</span>{/if}
				</div>
				<h2 class="titulo"><a href="/boletin/{p.boletin}">{p.titulo}</a></h2>
				<p class="datos">
					{#if p.fecha_ingreso}Ingreso {fechaCorta(p.fecha_ingreso)}{/if}
					{#if p.iniciativa}· {p.iniciativa}{/if}
					{#if p.camara_origen}· origen {p.camara_origen}{/if}
					{#if p.ley_numero}· <strong>{p.ley_numero}</strong>{/if}
					{#if p.ultimo_tramite}· último trámite {fechaCorta(p.ultimo_tramite)}{/if}
				</p>
			</li>
		{/each}
	</ol>

	{#if data.paginas > 1}
		<nav class="paginacion" aria-label="Páginas de resultados">
			<a
				class="boton secundario"
				href={f.pagina > 1 ? enlacePagina(f.pagina - 1) : undefined}
				aria-disabled={f.pagina <= 1 ? 'true' : undefined}
				rel="prev">← Anterior</a
			>
			<span>Página {f.pagina} de {numero.format(data.paginas)}</span>
			<a
				class="boton secundario"
				href={f.pagina < data.paginas ? enlacePagina(f.pagina + 1) : undefined}
				aria-disabled={f.pagina >= data.paginas ? 'true' : undefined}
				rel="next">Siguiente →</a
			>
		</nav>
	{/if}
{/if}

<style>
	h1 {
		margin: 0 0 0.4rem;
		font-size: clamp(1.6rem, 4vw, 2.2rem);
	}
	.intro {
		max-width: 48rem;
		color: var(--texto-suave);
		margin-top: 0;
	}
	.filtros {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 1rem;
		padding: 1.1rem;
		margin: 1.25rem 0;
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
	}
	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}
	.campo.ancho {
		grid-column: 1 / -1;
	}
	label,
	legend {
		font-weight: 600;
	}
	.opcional,
	.ayuda {
		font-weight: 400;
		color: var(--texto-suave);
		font-size: 0.9rem;
	}
	input[type='search'],
	select {
		font: inherit;
		min-height: 44px;
		padding: 0.45rem 0.7rem;
		border: 1px solid var(--borde);
		border-radius: 8px;
		background: var(--fondo);
		color: var(--texto);
		width: 100%;
	}
	fieldset.alcance {
		border: 0;
		padding: 0;
		margin: 0;
	}
	.opcion {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 400;
		min-height: 36px;
	}
	.opcion input {
		width: 1.15rem;
		height: 1.15rem;
		accent-color: var(--acento);
	}
	.acciones {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.6rem;
	}
	.resumen {
		font-weight: 600;
		color: var(--texto-suave);
	}
	.lista {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.75rem;
	}
	.tarjeta {
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		padding: 0.9rem 1.1rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem 0.6rem;
	}
	.boletin {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		color: var(--texto-suave);
		font-size: 0.9rem;
	}
	.titulo {
		font-size: 1.05rem;
		margin: 0.45rem 0 0.35rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.datos {
		margin: 0;
		font-size: 0.92rem;
		color: var(--texto-suave);
	}
	.vacio {
		padding: 1.25rem;
		border: 1px dashed var(--borde);
		border-radius: var(--radio);
	}
	.vacio h2 {
		margin-top: 0;
		font-size: 1.15rem;
	}
	.paginacion {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
</style>
