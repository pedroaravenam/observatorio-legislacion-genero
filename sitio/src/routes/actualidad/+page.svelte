<script lang="ts">
	import { claseEstado, fechaLarga } from '#lib/formato';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const a = $derived(data.actualidad);
	const numero = new Intl.NumberFormat('es-CL');
	const n = (x: number) => numero.format(x);
	const actualizado = $derived(fechaLarga(data.senadoConsultado));

	// Si la última consulta al Senado tiene más de tres días, la página lo dice en vez de parecer al día.
	const horasSinDatos = $derived(
		data.senadoConsultado
			? (Date.now() - new Date(data.senadoConsultado).getTime()) / 3_600_000
			: null
	);
	const atrasado = $derived(horasSinDatos === null || horasSinDatos > 72);

	/** Agrupa una lista ya ordenada por fecha descendente en tramos de un mismo día. */
	function porDia<T extends { fecha: string }>(lista: T[]): { fecha: string; filas: T[] }[] {
		const grupos: { fecha: string; filas: T[] }[] = [];
		for (const f of lista) {
			const dia = f.fecha.slice(0, 10);
			const ultimo = grupos.at(-1);
			if (ultimo?.fecha === dia) ultimo.filas.push(f);
			else grupos.push({ fecha: dia, filas: [f] });
		}
		return grupos;
	}
	/** El Senado abrevia la cámara donde ocurrió el trámite. */
	const CAMARAS: Record<string, string> = {
		'C.Diputados': 'Cámara de Diputadas y Diputados',
		Senado: 'Senado'
	};
	const movimientos = $derived(porDia(a.movimientos));
	const ingresos = $derived(porDia(a.ingresos));
</script>

<svelte:head>
	<title>Actualidad · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Los últimos movimientos de los proyectos de ley sobre género en el Congreso de Chile: trámites recientes, proyectos recién ingresados y leyes publicadas."
	/>
</svelte:head>

<section class="apertura" aria-labelledby="titulo">
	<div class="contenedor">
		<h1 id="titulo">Actualidad</h1>
		<p class="bajada">
			Lo último que se movió entre los proyectos de género: en los últimos 30 días ingresaron
			{n(a.ingresosMes)}
			{a.ingresosMes === 1 ? 'proyecto' : 'proyectos'} y {n(a.movidosMes)} tuvieron algún trámite.
			{#if actualizado}Datos del Senado al {actualizado}.{/if}
		</p>
		{#if atrasado}
			<p class="aviso" role="status">
				{#if actualizado}
					El Senado no entrega datos nuevos desde el {actualizado}, así que esta página puede no
					mostrar los movimientos más recientes.
				{:else}
					No se conoce la fecha de la última consulta al Senado, así que esta página puede no estar
					al día.
				{/if}
			</p>
		{/if}
	</div>
</section>

<div class="contenedor rejilla">
	<section aria-labelledby="mov-titulo" class="principal">
		<h2 id="mov-titulo">Últimos trámites</h2>
		{#if movimientos.length === 0}
			<p class="vacio">No hay trámites registrados en la selección.</p>
		{:else}
			{#each movimientos as g (g.fecha)}
				<h3 class="dia">{fechaLarga(g.fecha)}</h3>
				<ul class="lista">
					{#each g.filas as m (m.boletin)}
						<li>
							<p class="meta">
								<span class="boletin">Boletín {m.boletin}</span>
								{#if m.estado}<span class="estado {claseEstado(m.estado)}">{m.estado}</span>{/if}
							</p>
							<a class="titulo" href="/boletin/{m.boletin}">{m.titulo}</a>
							{#if m.tramite}
								<p class="tramite">
									{m.tramite}
									{#if m.camara}<span class="camara">{CAMARAS[m.camara] ?? m.camara}</span>{/if}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			{/each}
			<p>
				<a class="seguir" href="/proyectos?orden=movimiento">Ver todos por movimiento reciente</a>
			</p>
		{/if}
	</section>

	<div class="lateral">
		<section aria-labelledby="ing-titulo">
			<h2 id="ing-titulo">Proyectos recién ingresados</h2>
			{#if ingresos.length === 0}
				<p class="vacio">No hay ingresos registrados.</p>
			{:else}
				{#each ingresos as g (g.fecha)}
					<h3 class="dia">{fechaLarga(g.fecha)}</h3>
					<ul class="lista compacta">
						{#each g.filas as p (p.boletin)}
							<li>
								<p class="meta">
									<span class="boletin">Boletín {p.boletin}</span>
									{#if p.iniciativa}<span
											>{p.iniciativa}{p.camara_origen ? `, ${p.camara_origen}` : ''}</span
										>{/if}
								</p>
								<a class="titulo" href="/boletin/{p.boletin}">{p.titulo}</a>
							</li>
						{/each}
					</ul>
				{/each}
				<p><a class="seguir" href="/proyectos">Ver todos los proyectos</a></p>
			{/if}
		</section>

		<section aria-labelledby="ley-titulo">
			<h2 id="ley-titulo">Últimas leyes publicadas</h2>
			{#if a.leyes.length === 0}
				<p class="vacio">No hay leyes publicadas en la selección.</p>
			{:else}
				<ul class="lista compacta">
					{#each a.leyes as l (l.boletin)}
						<li>
							<p class="meta">
								<span class="estado publicado">{l.ley ?? 'Ley publicada'}</span>
								<span>{fechaLarga(l.fecha)}</span>
							</p>
							<a class="titulo" href="/boletin/{l.boletin}">{l.titulo}</a>
						</li>
					{/each}
				</ul>
				<p><a class="seguir" href="/proyectos?estado=Publicado">Ver todas las leyes</a></p>
			{/if}
		</section>
	</div>
</div>

<style>
	.apertura {
		padding: clamp(2rem, 5vw, 3.25rem) 0 1.5rem;
		border-bottom: 1px solid var(--borde);
		background: var(--superficie);
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2rem, 5vw, 3.1rem);
		line-height: 1.08;
		letter-spacing: -0.01em;
		margin: 0 0 0.7rem;
	}
	.bajada {
		max-width: 66ch;
		margin: 0;
		font-size: 1.08rem;
		color: var(--tinta-suave);
	}
	.aviso {
		max-width: 66ch;
		margin: 1.1rem 0 0;
	}
	.rejilla {
		display: grid;
		gap: 2.5rem 4rem;
		padding-top: 2.25rem;
	}
	@media (min-width: 62rem) {
		.rejilla {
			grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	.lateral {
		display: grid;
		gap: 2.5rem;
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(1.35rem, 3vw, 1.65rem);
		margin: 0 0 0.25rem;
	}
	.dia {
		margin: 1.5rem 0 0;
		padding-bottom: 0.4rem;
		border-bottom: 2px solid var(--violeta-medio);
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--tinta-suave);
	}
	.lista {
		list-style: none;
		margin: 0 0 0.5rem;
		padding: 0;
	}
	.lista li {
		padding: 0.95rem 0 1rem;
		border-bottom: 1px solid var(--borde);
	}
	.lista.compacta li {
		padding: 0.75rem 0 0.8rem;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.2rem 0.9rem;
		margin: 0 0 0.25rem;
		font-size: 0.86rem;
		color: var(--tinta-suave);
	}
	.boletin {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.titulo {
		display: block;
		font-family: var(--serif);
		font-size: 1.14rem;
		line-height: 1.3;
		font-weight: 600;
		color: var(--tinta);
		text-decoration: none;
		text-wrap: pretty;
	}
	.compacta .titulo {
		font-size: 1.02rem;
		/* Los títulos del Senado pueden ser muy largos: en la columna lateral se cortan a tres líneas. */
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}
	.titulo:hover {
		color: var(--violeta-medio);
		text-decoration: underline;
	}
	.tramite {
		margin: 0.4rem 0 0;
		font-size: 0.95rem;
		max-width: 70ch;
	}
	.camara {
		display: block;
		margin-top: 0.15rem;
		font-size: 0.88rem;
		color: var(--tinta-suave);
	}
	.vacio {
		color: var(--tinta-suave);
	}
</style>
