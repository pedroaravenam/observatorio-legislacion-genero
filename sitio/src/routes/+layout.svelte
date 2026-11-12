<script lang="ts">
	import '@fontsource-variable/public-sans';
	import '@fontsource-variable/newsreader';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import { fechaHoraChile } from '#lib/formato';
	import { AUTOR, CONTACTO, REPOSITORIO } from '#lib/sitio';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const consultado = $derived(fechaHoraChile(data.senadoConsultado));

	const SECCIONES = [
		{ ruta: '/', nombre: 'Inicio' },
		{ ruta: '/panorama', nombre: 'Panorama' },
		{ ruta: '/proyectos', nombre: 'Proyectos' },
		{ ruta: '/actualidad', nombre: 'Actualidad' },
		{ ruta: '/acerca', nombre: 'Cómo funciona' }
	];
	// Una ficha de boletín pertenece a «Proyectos».
	const actual = $derived(
		page.url.pathname.startsWith('/boletin/') ? '/proyectos' : page.url.pathname
	);

	// Tema: null sigue al sistema; el botón alterna entre claro y oscuro y lo recuerda en este navegador.
	let tema = $state<'light' | 'dark' | null>(null);
	let sistemaOscuro = $state(false);
	const oscuro = $derived(tema ? tema === 'dark' : sistemaOscuro);

	$effect(() => {
		const guardado = document.documentElement.dataset.theme;
		if (guardado === 'light' || guardado === 'dark') tema = guardado;
		const consulta = window.matchMedia('(prefers-color-scheme: dark)');
		sistemaOscuro = consulta.matches;
		const alCambiar = (e: MediaQueryListEvent) => (sistemaOscuro = e.matches);
		consulta.addEventListener('change', alCambiar);
		return () => consulta.removeEventListener('change', alCambiar);
	});

	function alternarTema() {
		const nuevo = oscuro ? 'light' : 'dark';
		tema = nuevo;
		document.documentElement.dataset.theme = nuevo;
		try {
			localStorage.setItem('tema', nuevo);
		} catch {
			// Sin almacenamiento (modo privado estricto), el tema vale solo para esta visita.
		}
	}

	// En pantallas angostas el menú es un desplegable: se cierra al cambiar de página.
	let menu = $state<HTMLDetailsElement | null>(null);
	afterNavigate(() => {
		if (menu) menu.open = false;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content={oscuro ? '#1c1723' : '#ffffff'} />
</svelte:head>

<a class="saltar visualmente-oculto" href="#contenido">Saltar al contenido</a>
{#if page.url.pathname === '/proyectos'}
	<a class="saltar visualmente-oculto" href="#filtros">Saltar al buscador</a>
{/if}

<header class="cabecera">
	<div class="contenedor fila">
		<a class="marca" href="/">
			<img class="sello" src={favicon} alt="" width="34" height="34" />
			<span class="nombre">
				<span class="nombre-1">Observatorio de</span>
				<span class="nombre-2">Legislación de Género</span>
			</span>
		</a>

		<nav class="ancha" aria-label="Principal">
			{#each SECCIONES as s (s.ruta)}
				<a href={s.ruta} aria-current={actual === s.ruta ? 'page' : undefined}>{s.nombre}</a>
			{/each}
		</nav>

		<div class="controles">
			<button
				class="tema"
				type="button"
				onclick={alternarTema}
				aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
				title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
			>
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class:oscuro>
					<circle class="astro" cx="12" cy="12" r="4.5" />
					<g class="rayos">
						<path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4" />
						<path d="M5.3 5.3 7 7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
					</g>
					<path class="luna" d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z" />
				</svg>
			</button>

			<details class="menu" bind:this={menu}>
				<summary>
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
						<path d="M4 7h16M4 12h16M4 17h16" />
					</svg>
					<span class="menu-texto">Menú</span>
				</summary>
				<nav aria-label="Principal">
					{#each SECCIONES as s (s.ruta)}
						<a href={s.ruta} aria-current={actual === s.ruta ? 'page' : undefined}>{s.nombre}</a>
					{/each}
				</nav>
			</details>
		</div>
	</div>
</header>

<main id="contenido" aria-busy={navigating.to ? 'true' : 'false'}>
	{@render children()}
</main>

<footer class="pie">
	<div class="contenedor pie-rejilla">
		<div>
			<p class="pie-titulo">Observatorio de Legislación de Género</p>
			<p>
				Proyecto independiente y sin fines de lucro, desarrollado por {AUTOR.nombre}, que busca
				mantener al día el seguimiento de las iniciativas de género en el Congreso de Chile.
			</p>
			<p>
				El <a href={REPOSITORIO}>código es abierto</a>, con licencia AGPL-3.0.
			</p>
		</div>
		<div>
			<p class="pie-titulo">Contacto y apoyo</p>
			<p>
				Escríbenos a <a href="mailto:{CONTACTO}">{CONTACTO}</a> para avisar de un error, proponer una
				corrección o preguntar por los datos.
			</p>
			<p><a href="/acerca#apoyo">Cómo apoyar el mantenimiento del sitio</a></p>
		</div>
		<div>
			<p class="pie-titulo">Datos</p>
			<p>
				{#if consultado}
					La tramitación se consultó al Senado por última vez el {consultado}.
				{:else}
					No está disponible la fecha de la última consulta al Senado.
				{/if}
			</p>
			<p>
				Los datos provienen del Senado de la República y de la Biblioteca del Congreso Nacional,
				instituciones que no patrocinan ni operan este sitio.
			</p>
		</div>
	</div>
</footer>

<style>
	.saltar:focus {
		position: fixed;
		top: 8px;
		left: 8px;
		width: auto;
		height: auto;
		clip-path: none;
		padding: 0.6rem 1rem;
		background: var(--superficie);
		color: var(--tinta);
		z-index: 30;
	}
	.cabecera {
		position: sticky;
		top: 0;
		z-index: 20;
		background: var(--superficie);
		border-bottom: 1px solid var(--borde);
	}
	.fila {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		padding-top: 0.55rem;
		padding-bottom: 0.55rem;
	}
	.marca {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 44px;
		color: var(--tinta);
		text-decoration: none;
	}
	.sello {
		flex: none;
		border-radius: 7px;
	}
	.nombre {
		display: flex;
		flex-direction: column;
		font-family: var(--serif);
		line-height: 1.1;
	}
	.nombre-1 {
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.nombre-2 {
		font-size: 1.15rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.ancha {
		display: none;
		gap: 0.15rem;
		margin-left: auto;
	}
	.ancha a {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.8rem;
		border-radius: var(--radio);
		color: var(--tinta-suave);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
		transition:
			color 150ms ease,
			background-color 150ms ease;
	}
	.ancha a:hover {
		color: var(--tinta);
		background: var(--hundido);
	}
	.ancha a[aria-current='page'] {
		color: var(--violeta);
		font-weight: 600;
	}
	.ancha a[aria-current='page']::after {
		content: '';
		position: absolute;
		left: 0.8rem;
		right: 0.8rem;
		bottom: -0.55rem;
		height: 3px;
		border-radius: 3px 3px 0 0;
		background: var(--violeta-medio);
	}

	.controles {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.tema,
	.menu summary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		min-width: 44px;
		min-height: 44px;
		padding: 0 0.6rem;
		border: 1px solid var(--borde);
		border-radius: var(--radio);
		background: var(--superficie);
		color: var(--tinta);
		font: inherit;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition:
			border-color 150ms ease,
			background-color 150ms ease;
	}
	.tema:hover,
	.menu summary:hover {
		border-color: var(--violeta-medio);
		background: var(--violeta-suave);
	}
	/* Sin JavaScript el botón no puede cambiar nada: no se muestra y el sitio sigue al sistema. */
	.tema {
		display: none;
	}
	:global(.con-js) .tema {
		display: inline-flex;
	}
	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.tema .luna {
		opacity: 0;
		transform-origin: 12px 12px;
		rotate: -40deg;
	}
	.tema .astro,
	.tema .rayos,
	.tema .luna {
		transition:
			opacity 250ms var(--salida),
			rotate 400ms var(--salida),
			scale 400ms var(--salida);
		transform-origin: 12px 12px;
	}
	.tema svg.oscuro .luna {
		opacity: 1;
		rotate: 0deg;
	}
	.tema svg.oscuro .astro,
	.tema svg.oscuro .rayos {
		opacity: 0;
		scale: 0.6;
		rotate: 60deg;
	}

	.menu {
		position: relative;
	}
	.menu summary {
		list-style: none;
	}
	.menu summary::-webkit-details-marker {
		display: none;
	}
	.menu nav {
		position: absolute;
		right: 0;
		top: calc(100% + 0.5rem);
		display: grid;
		min-width: 14rem;
		padding: 0.4rem;
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-radius: var(--radio-grande);
		box-shadow: var(--sombra);
	}
	.menu nav a {
		display: flex;
		align-items: center;
		min-height: 48px;
		padding: 0 0.9rem;
		border-radius: var(--radio);
		color: var(--tinta);
		text-decoration: none;
		font-weight: 500;
	}
	.menu nav a:hover {
		background: var(--hundido);
	}
	.menu nav a[aria-current='page'] {
		background: var(--violeta-suave);
		color: var(--violeta);
		font-weight: 600;
	}
	@media (min-width: 62rem) {
		.ancha {
			display: flex;
		}
		.menu {
			display: none;
		}
	}
	/* En teléfonos el botón del menú queda solo con su ícono; el texto sigue disponible para lectores de pantalla. */
	@media (max-width: 30rem) {
		.fila {
			gap: 0.5rem;
		}
		.marca {
			gap: 0.55rem;
		}
		.menu-texto {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}
	@media (max-width: 24rem) {
		.nombre-1 {
			font-size: 0.78rem;
		}
		.nombre-2 {
			font-size: 1rem;
			white-space: normal;
		}
	}

	main {
		min-height: 60vh;
		padding-bottom: 4rem;
		transition: opacity 200ms ease;
	}
	/* Mientras carga otra página el contenido se atenúa, pero solo si tarda: las cargas rápidas no parpadean. */
	main[aria-busy='true'] {
		opacity: 0.55;
		transition-delay: 300ms;
	}
	.pie {
		border-top: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--tinta-suave);
		font-size: 0.9rem;
		padding: 2.5rem 0 3rem;
	}
	.pie-rejilla {
		display: grid;
		gap: 1.75rem 3rem;
	}
	@media (min-width: 48rem) {
		.pie-rejilla {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.pie p {
		margin: 0 0 0.5rem;
		max-width: 46ch;
	}
	.pie-titulo {
		font-family: var(--serif);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--tinta);
	}
	@media (prefers-reduced-motion: reduce) {
		main {
			transition: none;
		}
		.tema .astro,
		.tema .rayos,
		.tema .luna {
			transition: none;
		}
	}
</style>
