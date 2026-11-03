<script lang="ts">
	import GraficoAnual from '../lib/GraficoAnual.svelte';
	import { claseEstado, fechaCorta } from '#lib/formato';
	import { TEMAS } from '#lib/temas';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const f = $derived(data.filtros);
	const hayFiltros = $derived(
		Boolean(f.texto || f.anno || f.estado || f.iniciativa || f.tema || !f.soloGenero)
	);
	const totales = $derived(
		data.resumen.reduce((a, r) => ({ total: a.total + r.total, leyes: a.leyes + r.leyes }), {
			total: 0,
			leyes: 0
		})
	);
	const desde = $derived(data.resumen[0]?.anno ?? 1990);

	function enlacePagina(n: number, todos = !f.soloGenero): string {
		const p = new URLSearchParams();
		if (f.texto) p.set('q', f.texto);
		if (f.anno) p.set('anno', String(f.anno));
		if (f.estado) p.set('estado', f.estado);
		if (f.iniciativa) p.set('iniciativa', f.iniciativa);
		if (f.tema) p.set('tema', f.tema);
		if (todos) p.set('alcance', 'todos');
		if (n > 1) p.set('pagina', String(n));
		const s = p.toString();
		return s ? `/?${s}` : '/';
	}

	const numero = new Intl.NumberFormat('es-CL');
</script>

<svelte:head>
	<title>{f.texto ? `«${f.texto}» · ` : ''}Proyectos · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Busca proyectos de ley relacionados con género en Chile desde 1990, con su tramitación y enlace a la fuente oficial."
	/>
</svelte:head>

<section class="franja" aria-labelledby="titulo">
	<div class="contenedor">
		<h1 id="titulo">Proyectos de ley sobre género en Chile, desde {desde}</h1>
		<p class="bajada">
			Desde {desde} se han presentado {numero.format(totales.total)} proyectos de ley que tratan temas
			de género, y {numero.format(totales.leyes)} ya son ley. Aquí puedes buscarlos, ver en qué etapa
			está cada uno y abrir sus documentos en el Senado y en la Biblioteca del Congreso.
		</p>
		<GraficoAnual resumen={data.resumen} seleccionado={f.anno} />
	</div>
</section>

<div class="contenedor">
	<form method="GET" action="/" class="filtros" role="search" aria-label="Buscar proyectos">
		<div class="busqueda">
			<label for="q">Buscar <span class="opcional">(opcional)</span></label>
			<div class="busqueda-fila">
				<input
					id="q"
					name="q"
					type="search"
					value={f.texto}
					maxlength="200"
					placeholder="Palabras o número de boletín"
					aria-describedby="q-ayuda"
					enterkeyhint="search"
				/>
				<button class="boton" type="submit">Buscar</button>
			</div>
			<p id="q-ayuda" class="ayuda">
				Escribe palabras, como «sala cuna», o un número de boletín, como 11077-07. La búsqueda
				revisa títulos, materias y autores.
			</p>
		</div>

		<div class="selectores">
			<div class="campo">
				<label for="tema">Tema</label>
				<select id="tema" name="tema">
					<option value="">Todos</option>
					{#each TEMAS as t (t.clave)}
						<option value={t.clave} selected={f.tema === t.clave}>{t.nombre}</option>
					{/each}
				</select>
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
			<fieldset class="alcance">
				<legend>Mostrar</legend>
				<div class="segmentos">
					<label>
						<input type="radio" name="alcance" value="genero" checked={f.soloGenero} />
						<span>Selección de género</span>
					</label>
					<label>
						<input type="radio" name="alcance" value="todos" checked={!f.soloGenero} />
						<span>Todos</span>
					</label>
				</div>
			</fieldset>
		</div>

		<div class="acciones">
			<button class="boton secundario" type="submit">Aplicar filtros</button>
			{#if hayFiltros}
				<a class="limpiar" href="/">Quitar filtros</a>
			{/if}
		</div>
	</form>

	<div class="resultados-cabecera">
		<h2 class="resumen" role="status">
			{#if data.total === 0}
				Sin resultados
			{:else}
				{numero.format(data.total)}
				{data.total === 1 ? 'proyecto' : 'proyectos'}
				{#if f.anno}<span class="suave">de {f.anno}</span>{/if}
			{/if}
		</h2>
		{#if data.paginas > 1}
			<p class="suave">Página {f.pagina} de {numero.format(data.paginas)}</p>
		{/if}
	</div>

	{#if data.total === 0}
		<div class="vacio">
			<h3>No hay proyectos con esos criterios</h3>
			<ul>
				{#if f.soloGenero && !data.porNumero}
					<li>
						La búsqueda se limitó a la selección de género.
						<a href={enlacePagina(1, true)}>Buscar en todos los proyectos</a>.
					</li>
				{/if}
				<li>Prueba con menos palabras; no hace falta escribir los acentos.</li>
				<li>Si buscas un boletín, escríbelo con su guion, por ejemplo 11077-07.</li>
			</ul>
		</div>
	{:else}
		<ol class="lista">
			{#each data.filas as p (p.boletin)}
				<li class="fila {claseEstado(p.estado)}">
					<div class="fila-meta">
						<span class="boletin">Boletín {p.boletin}</span>
						{#if p.estado}<span class="estado {claseEstado(p.estado)}">{p.estado}</span>{/if}
						{#if p.genero && !f.soloGenero}<span class="marca-genero">Selección de género</span
							>{/if}
					</div>
					<h3 class="titulo"><a href="/boletin/{p.boletin}">{p.titulo}</a></h3>
					<p class="datos">
						{#if p.iniciativa}<span
								>{p.iniciativa}{p.camara_origen ? `, ${p.camara_origen}` : ''}</span
							>{/if}
						{#if p.fecha_ingreso}<span>Ingreso {fechaCorta(p.fecha_ingreso)}</span>{/if}
						{#if p.ultimo_tramite}<span>Último trámite {fechaCorta(p.ultimo_tramite)}</span>{/if}
						{#if p.ley_numero}<span class="ley">{p.ley_numero}</span>{/if}
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
					rel="prev">Anterior</a
				>
				<span>Página {f.pagina} de {numero.format(data.paginas)}</span>
				<a
					class="boton secundario"
					href={f.pagina < data.paginas ? enlacePagina(f.pagina + 1) : undefined}
					aria-disabled={f.pagina >= data.paginas ? 'true' : undefined}
					rel="next">Siguiente</a
				>
			</nav>
		{/if}
	{/if}
</div>

<style>
	.franja {
		background: var(--franja);
		color: var(--franja-texto);
		padding: 2.25rem 0 1.75rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2rem, 5.2vw, 3.4rem);
		line-height: 1.05;
		letter-spacing: -0.01em;
		max-width: 20ch;
		margin: 0 0 0.9rem;
	}
	.bajada {
		max-width: 60ch;
		margin: 0 0 2rem;
		font-size: 1.05rem;
		color: var(--franja-suave);
	}
	.filtros {
		position: relative;
		display: grid;
		gap: 1.1rem;
		margin: -0.75rem 0 2rem;
		padding: 1.25rem;
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-radius: 10px;
		box-shadow: 0 10px 30px -18px rgb(43 23 72 / 0.45);
	}
	@media (min-width: 48rem) {
		.filtros {
			padding: 1.5rem 1.75rem;
		}
	}
	label,
	legend {
		font-weight: 600;
		font-size: 0.95rem;
	}
	.opcional,
	.ayuda {
		font-weight: 400;
		color: var(--tinta-suave);
		font-size: 0.88rem;
	}
	.ayuda {
		margin: 0.35rem 0 0;
	}
	.busqueda-fila {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.35rem;
	}
	input[type='search'],
	select {
		font: inherit;
		min-height: 48px;
		padding: 0.5rem 0.8rem;
		border: 1px solid var(--borde-fuerte);
		border-radius: var(--radio);
		background: var(--papel);
		color: var(--tinta);
		width: 100%;
		min-width: 0;
	}
	input[type='search'] {
		font-size: 1.05rem;
	}
	input[type='search']:hover,
	select:hover {
		border-color: var(--violeta-medio);
	}
	.selectores {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11.5rem, 1fr));
		gap: 1rem;
		align-items: end;
	}
	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}
	.alcance {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	.alcance legend {
		padding: 0;
		margin-bottom: 0.35rem;
	}
	.segmentos {
		display: flex;
		border: 1px solid var(--borde-fuerte);
		border-radius: var(--radio);
		overflow: hidden;
	}
	.segmentos label {
		flex: 1;
		position: relative;
		font-weight: 500;
	}
	.segmentos input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.segmentos span {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 46px;
		padding: 0 0.6rem;
		text-align: center;
		line-height: 1.15;
		font-size: 0.92rem;
		background: var(--papel);
	}
	.segmentos label + label span {
		border-left: 1px solid var(--borde-fuerte);
	}
	.segmentos input:checked + span {
		background: var(--violeta);
		color: var(--sobre-violeta);
		font-weight: 600;
	}
	.segmentos input:focus-visible + span {
		outline: 3px solid var(--foco);
		outline-offset: -3px;
	}
	.acciones {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.25rem;
	}
	.limpiar {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.resultados-cabecera {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		border-bottom: 2px solid var(--tinta);
		padding-bottom: 0.5rem;
	}
	.resumen {
		font-family: var(--serif);
		font-size: 1.6rem;
		font-weight: 500;
		margin: 0;
	}
	.suave {
		color: var(--tinta-suave);
		font-size: 0.95rem;
		margin: 0;
	}
	.resumen .suave {
		font-size: inherit;
	}
	.lista {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.fila {
		position: relative;
		padding: 1.1rem 0 1.15rem 1.1rem;
		border-bottom: 1px solid var(--borde);
	}
	.fila::before {
		content: '';
		position: absolute;
		left: 0;
		top: 1.2rem;
		bottom: 1.2rem;
		width: 3px;
		border-radius: 2px;
		background: var(--cerrado);
		opacity: 0.5;
	}
	.fila.publicado::before {
		background: var(--verde);
		opacity: 1;
	}
	.fila.tramitacion::before {
		background: var(--violeta-medio);
		opacity: 1;
	}
	.fila-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.9rem;
	}
	.boletin {
		font-variant-numeric: tabular-nums;
		font-size: 0.86rem;
		font-weight: 600;
		color: var(--tinta-suave);
	}
	.titulo {
		font-family: var(--serif);
		font-size: 1.22rem;
		font-weight: 500;
		line-height: 1.3;
		margin: 0.3rem 0 0.4rem;
		max-width: 62ch;
		overflow-wrap: anywhere;
	}
	.titulo a {
		color: var(--tinta);
		text-decoration: none;
	}
	.titulo a:hover {
		color: var(--violeta-medio);
		text-decoration: underline;
		text-decoration-thickness: 1px;
	}
	.datos {
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 1.1rem;
		margin: 0;
		font-size: 0.88rem;
		color: var(--tinta-suave);
		font-variant-numeric: tabular-nums;
	}
	.datos .ley {
		color: var(--verde);
		font-weight: 600;
	}
	.vacio {
		margin-top: 1.5rem;
		padding: 1.25rem 1.5rem;
		background: var(--superficie);
		border: 1px dashed var(--borde-fuerte);
		border-radius: 10px;
	}
	.vacio h3 {
		margin-top: 0;
		font-family: var(--serif);
		font-weight: 500;
		font-size: 1.3rem;
	}
	.paginacion {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 2rem;
	}
</style>
