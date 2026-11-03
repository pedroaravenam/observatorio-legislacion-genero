<script lang="ts">
	import {
		claseEstado,
		etiquetaSenal,
		fechaCorta,
		fechaHoraChile,
		fechaLarga,
		numeroLey,
		PASOS_TRAMITACION,
		pasoTramitacion,
		urlFichaSenado,
		urlLeyBcn
	} from '#lib/formato';
	import { TEMAS, temasDe } from '#lib/temas';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.proyecto);
	const ley = $derived(numeroLey(p.ley_numero));
	const paso = $derived(pasoTramitacion(p.estado, p.etapa));
	const temas = $derived(TEMAS.filter((t) => temasDe(p.titulo).includes(t.clave)));

	// Trámites del más reciente al más antiguo, agrupados por año.
	const porAnno = $derived.by(() => {
		const grupos: { anno: string; tramites: typeof p.tramites }[] = [];
		for (const t of [...p.tramites].reverse()) {
			const anno = t[0]?.slice(0, 4) ?? 'Sin fecha';
			const ultimo = grupos.at(-1);
			if (ultimo && ultimo.anno === anno) ultimo.tramites.push(t);
			else grupos.push({ anno, tramites: [t] });
		}
		return grupos;
	});
</script>

<svelte:head>
	<title>Boletín {p.boletin} · Observatorio de Legislación de Género</title>
	<meta name="description" content={p.titulo.slice(0, 300)} />
</svelte:head>

<article class="contenedor">
	<p class="volver"><a href="/">Volver a los proyectos</a></p>

	<header class="encabezado">
		<p class="meta">
			<span class="boletin">Boletín {p.boletin}</span>
			{#if p.estado}<span class="estado {claseEstado(p.estado)}">{p.estado}</span>{/if}
			{#if p.genero}<span class="marca-genero">Selección de género</span>{/if}
		</p>
		<h1>{p.titulo}</h1>

		{#if paso !== null}
			<ol class="pasos" aria-label="Avance en el proceso legislativo">
				{#each PASOS_TRAMITACION as nombre, i (nombre)}
					<li
						class:hecho={i < paso || paso === 4}
						class:actual={i === paso && paso !== 4}
						aria-current={i === paso ? 'step' : undefined}
					>
						<span class="paso-nombre">{nombre}</span>
						<span class="visualmente-oculto"
							>{i < paso || paso === 4
								? '(completado)'
								: i === paso
									? '(etapa actual)'
									: '(pendiente)'}</span
						>
					</li>
				{/each}
			</ol>
		{/if}

		<div class="fuentes">
			<a class="boton" href={urlFichaSenado(p.boletin)} rel="external noopener" target="_blank">
				Tramitación en el Senado<span class="visualmente-oculto"> (abre en otra pestaña)</span>
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
					Ley {ley.toLocaleString('es-CL')} en la BCN<span class="visualmente-oculto">
						(abre en otra pestaña)</span
					>
				</a>
			{/if}
		</div>
		<p class="nota">
			Los documentos se abren en el sitio oficial de cada institución, así que, si alguno no carga,
			lo más probable es que esa fuente esté fuera de servicio por un momento.
		</p>
	</header>

	<div class="cuerpo">
		<aside class="lateral" aria-label="Datos del proyecto">
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
									? 'Mensaje de la Presidencia de la República'
									: 'Moción parlamentaria'}
							</dd>
						</div>{/if}
					{#if p.camara_origen}<div>
							<dt>Cámara de origen</dt>
							<dd>{p.camara_origen}</dd>
						</div>{/if}
					{#if p.etapa}<div>
							<dt>Etapa según el Senado</dt>
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
							<dd class="ley">
								{p.ley_numero}{#if p.diario_oficial}, publicada el {fechaLarga(
										p.diario_oficial
									)}{/if}
							</dd>
						</div>{/if}
				</dl>
			</section>

			{#if p.genero && p.nivel_senal}
				<section class="aviso" aria-labelledby="seleccion-titulo">
					<h2 id="seleccion-titulo">Por qué está en la selección de género</h2>
					<p>{etiquetaSenal(p.nivel_senal)}.</p>
					{#if temas.length}
						<p>
							{temas.length === 1 ? 'Tema' : 'Temas'}:
							{#each temas as t, i (t.clave)}{i > 0 ? ', ' : ''}<a href="/?tema={t.clave}"
									>{t.nombre.toLocaleLowerCase('es-CL')}</a
								>{/each}.
						</p>
					{/if}
					<p><a href="/acerca#seleccion">Cómo seleccionamos los proyectos</a></p>
				</section>
			{/if}

			{#if p.autores.length}
				<section aria-labelledby="autores-titulo">
					<h2 id="autores-titulo">
						{p.autores.length === 1 ? 'Autor o autora' : `Autores (${p.autores.length})`}
					</h2>
					<ul class="nombres">
						{#each p.autores as a (a)}<li>
								<a href="/?autor={encodeURIComponent(a)}">{a}</a>
							</li>{/each}
					</ul>
				</section>
			{/if}

			{#if p.materias.length}
				<section aria-labelledby="materias-titulo">
					<h2 id="materias-titulo">Materias</h2>
					<ul class="materias">
						{#each p.materias as m (m)}<li>{m.toLocaleLowerCase('es-CL')}</li>{/each}
					</ul>
				</section>
			{/if}
		</aside>

		<section class="principal" aria-labelledby="tramites-titulo">
			<h2 id="tramites-titulo">Tramitación</h2>
			<p class="suave">
				{p.tramites.length === 1
					? 'Se muestra el único trámite registrado.'
					: `Se muestran los ${p.tramites.length} trámites registrados, del más reciente al más antiguo.`}
			</p>
			{#if p.tramites.length === 0}
				<p>El Senado todavía no registra trámites para este proyecto.</p>
			{:else}
				{#each porAnno as grupo (grupo.anno)}
					<h3 class="anno">{grupo.anno}</h3>
					<ol class="tramites">
						{#each grupo.tramites as [fecha, sesion, descripcion, etapa, camara], i (i)}
							<li>
								<p class="t-fecha">
									<strong>{fechaCorta(fecha) ?? 'Sin fecha'}</strong>
									{#if camara}<span>{camara}</span>{/if}
									{#if sesion}<span>Sesión {sesion}</span>{/if}
								</p>
								<p class="t-desc">{descripcion}</p>
								{#if etapa}<p class="t-etapa">{etapa}</p>{/if}
							</li>
						{/each}
					</ol>
				{/each}
			{/if}
		</section>
	</div>

	<p class="procedencia">
		Los datos de esta ficha provienen del servicio de tramitación del Senado.
		{#if fechaHoraChile(p.actualizado)}Su último cambio se registró el {fechaHoraChile(
				p.actualizado
			)}.{/if}
	</p>
</article>

<style>
	.volver {
		margin: 1.25rem 0 0.75rem;
		font-size: 0.95rem;
	}
	.volver a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.encabezado {
		padding-bottom: 1.75rem;
		border-bottom: 2px solid var(--tinta);
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		align-items: center;
		margin: 0;
	}
	.boletin {
		font-weight: 600;
		color: var(--tinta-suave);
		font-variant-numeric: tabular-nums;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(1.6rem, 3.8vw, 2.45rem);
		line-height: 1.15;
		max-width: 34ch;
		margin: 0.6rem 0 1.5rem;
		overflow-wrap: anywhere;
	}
	.pasos {
		list-style: none;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 4px;
		margin: 0 0 1.5rem;
		padding: 0;
		max-width: 52rem;
	}
	.pasos li {
		position: relative;
		padding-top: 0.75rem;
		font-size: 0.82rem;
		line-height: 1.25;
		color: var(--tinta-suave);
	}
	.pasos li::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 5px;
		border-radius: 3px;
		background: var(--borde);
	}
	.pasos li.hecho::before {
		background: var(--verde);
	}
	.pasos li.actual::before {
		background: var(--violeta-medio);
	}
	.pasos li.actual {
		color: var(--tinta);
		font-weight: 600;
	}
	@media (max-width: 40rem) {
		.pasos .paso-nombre {
			display: none;
		}
		.pasos li.actual .paso-nombre {
			display: block;
			position: absolute;
			white-space: nowrap;
			left: 0;
		}
		.pasos li:nth-child(n + 4).actual .paso-nombre {
			left: auto;
			right: 0;
		}
		.pasos {
			padding-bottom: 1.2rem;
		}
	}
	.fuentes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.nota {
		font-size: 0.88rem;
		color: var(--tinta-suave);
		margin: 0.7rem 0 0;
	}
	.cuerpo {
		display: grid;
		gap: 0 3.5rem;
	}
	@media (min-width: 60rem) {
		.cuerpo {
			grid-template-columns: minmax(0, 1fr) 21rem;
		}
		.lateral {
			grid-column: 2;
			grid-row: 1;
		}
		.principal {
			grid-column: 1;
			grid-row: 1;
		}
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 1.3rem;
		margin: 2rem 0 0.6rem;
	}
	.lateral h2 {
		font-size: 1.1rem;
	}
	.suave {
		color: var(--tinta-suave);
		font-size: 0.92rem;
		margin: 0;
	}
	.datos {
		display: grid;
		gap: 0.85rem;
		margin: 0;
	}
	.datos dt {
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.datos dd {
		margin: 0.1rem 0 0;
	}
	.datos .ley {
		color: var(--verde);
		font-weight: 600;
	}
	.aviso {
		margin-top: 2rem;
	}
	.aviso h2 {
		margin: 0 0 0.3rem;
		font-size: 1.02rem;
	}
	.aviso p {
		margin: 0;
		font-size: 0.95rem;
	}
	.nombres {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.95rem;
	}
	.materias {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.materias li {
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		background: var(--violeta-suave);
		color: var(--tinta);
		font-size: 0.85rem;
	}
	.anno {
		font-family: var(--serif);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--violeta-medio);
		margin: 1.5rem 0 0.6rem;
		font-variant-numeric: tabular-nums;
	}
	.tramites {
		list-style: none;
		margin: 0;
		padding: 0;
		border-left: 2px solid var(--borde);
	}
	.tramites li {
		position: relative;
		padding: 0 0 1.1rem 1.2rem;
	}
	.tramites li::before {
		content: '';
		position: absolute;
		left: -6px;
		top: 0.45rem;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--papel);
		border: 2px solid var(--violeta-medio);
	}
	.tramites p {
		margin: 0;
	}
	.t-fecha {
		display: flex;
		flex-wrap: wrap;
		gap: 0 0.9rem;
		font-size: 0.88rem;
		color: var(--tinta-suave);
		font-variant-numeric: tabular-nums;
	}
	.t-fecha strong {
		color: var(--tinta);
	}
	.t-desc {
		max-width: 68ch;
		overflow-wrap: anywhere;
	}
	.t-etapa {
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.procedencia {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--borde);
		font-size: 0.88rem;
		color: var(--tinta-suave);
	}
</style>
