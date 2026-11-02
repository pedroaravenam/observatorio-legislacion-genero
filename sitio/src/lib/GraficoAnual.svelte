<script lang="ts">
	import type { ResumenAnno } from '#lib/server/consultas';

	interface Props {
		resumen: ResumenAnno[];
		seleccionado: number | null;
	}
	let { resumen, seleccionado }: Props = $props();

	const numero = new Intl.NumberFormat('es-CL');
	const maximo = $derived(Math.max(1, ...resumen.map((r) => r.total)));
	const ultimo = $derived(resumen.at(-1)?.anno ?? null);
	const totales = $derived(
		resumen.reduce((a, r) => ({ total: a.total + r.total, leyes: a.leyes + r.leyes }), {
			total: 0,
			leyes: 0
		})
	);

	// Año bajo el cursor o el foco; si no hay, el año filtrado; si no, el total.
	let activo = $state<number | null>(null);
	const visible = $derived(resumen.find((r) => r.anno === (activo ?? seleccionado)) ?? null);

	function texto(r: ResumenAnno): string {
		const enCurso = r.anno === ultimo ? ' (año en curso)' : '';
		return `${r.anno}${enCurso}: ${numero.format(r.total)} ${r.total === 1 ? 'proyecto' : 'proyectos'}, ${numero.format(r.leyes)} ya ${r.leyes === 1 ? 'es ley' : 'son ley'}`;
	}
</script>

<figure class="grafico">
	<figcaption>
		<span class="lectura" aria-live="polite">
			{#if visible}
				<strong>{visible.anno}</strong>
				{numero.format(visible.total)}
				{visible.total === 1 ? 'proyecto presentado' : 'proyectos presentados'},
				{numero.format(visible.leyes)}
				{visible.leyes === 1 ? 'ya es ley' : 'ya son ley'}{visible.anno === ultimo
					? ' (año en curso)'
					: ''}
			{:else}
				Proyectos presentados cada año. Elige un año para ver sus proyectos.
			{/if}
		</span>
		<span class="leyenda" aria-hidden="true">
			<span class="clave presentados"></span>Presentados
			<span class="clave leyes"></span>Hoy son ley
		</span>
	</figcaption>

	<ol
		class="barras"
		style="--n: {resumen.length}"
		aria-label="Proyectos de la selección por año de ingreso"
	>
		{#each resumen as r (r.anno)}
			<li>
				<a
					href="/?anno={r.anno}"
					aria-label={texto(r)}
					aria-current={seleccionado === r.anno ? 'true' : undefined}
					onmouseenter={() => (activo = r.anno)}
					onmouseleave={() => (activo = null)}
					onfocus={() => (activo = r.anno)}
					onblur={() => (activo = null)}
				>
					<span class="columna" style="--alto: {(r.total / maximo) * 100}%">
						<span class="ley" style="--alto: {r.total ? (r.leyes / r.total) * 100 : 0}%"></span>
					</span>
					<span
						class="anno"
						class:mostrar={(r.anno % 5 === 0 && (ultimo ?? 0) - r.anno >= 3) || r.anno === ultimo}
						>{r.anno}</span
					>
				</a>
			</li>
		{/each}
	</ol>
	<p class="visualmente-oculto">
		En total, {numero.format(totales.total)} proyectos; {numero.format(totales.leyes)} ya son ley.
	</p>
</figure>

<style>
	.grafico {
		margin: 0;
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.4rem 1.5rem;
		margin-bottom: 0.9rem;
		font-size: 0.95rem;
		color: var(--franja-suave);
		min-height: 1.6em;
	}
	.lectura strong {
		color: var(--franja-texto);
		font-size: 1.05rem;
		margin-right: 0.3rem;
		font-variant-numeric: tabular-nums;
	}
	.leyenda {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
	}
	.clave {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
	}
	.clave.presentados {
		background: var(--barra);
	}
	.clave.leyes {
		background: var(--barra-ley);
		margin-left: 0.6rem;
	}
	.barras {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(var(--n, 37), 1fr);
		grid-auto-flow: column;
		align-items: end;
		gap: 2px;
		height: clamp(9rem, 22vw, 13rem);
	}
	.barras li {
		height: 100%;
		min-width: 0;
	}
	.barras a {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		height: 100%;
		padding-bottom: 1.5rem;
		text-decoration: none;
		border-radius: 2px;
	}
	.columna {
		position: relative;
		display: block;
		height: var(--alto);
		min-height: 2px;
		background: var(--barra);
		border-radius: 2px 2px 0 0;
		transition: background-color 120ms ease;
	}
	.ley {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--alto);
		background: var(--barra-ley);
	}
	.barras a:hover .columna,
	.barras a:focus-visible .columna,
	.barras a[aria-current='true'] .columna {
		background: var(--franja-texto);
	}
	.barras a:focus-visible {
		outline-offset: 1px;
	}
	.anno {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.75rem;
		color: var(--franja-suave);
		font-variant-numeric: tabular-nums;
		visibility: hidden;
	}
	.anno.mostrar {
		visibility: visible;
	}
	li:first-child .anno {
		left: 0;
		transform: none;
		visibility: visible;
	}
	li:last-child .anno {
		left: auto;
		right: 0;
		transform: none;
	}
	@media (max-width: 40rem) {
		li:not(:first-child, :last-child) .anno.mostrar {
			visibility: hidden;
		}
		.barras {
			gap: 1px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.columna {
			transition: none;
		}
	}
</style>
