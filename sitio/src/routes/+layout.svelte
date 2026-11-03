<script lang="ts">
	import '@fontsource-variable/public-sans';
	import '@fontsource-variable/newsreader';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page, navigating } from '$app/state';
	import { fechaHoraChile } from '#lib/formato';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const consultado = $derived(fechaHoraChile(data.senadoConsultado));
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<meta name="theme-color" content="#2b1748" />
</svelte:head>

<a class="saltar visualmente-oculto" href="#contenido">Saltar al contenido</a>
{#if page.url.pathname === '/'}
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
		<nav aria-label="Principal">
			<a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>Proyectos</a>
			<a href="/panorama" aria-current={page.url.pathname === '/panorama' ? 'page' : undefined}
				>Panorama</a
			>
			<a href="/acerca" aria-current={page.url.pathname === '/acerca' ? 'page' : undefined}
				>Cómo funciona</a
			>
		</nav>
	</div>
	{#if navigating.to}
		<div class="progreso" role="progressbar" aria-label="Cargando"></div>
	{/if}
</header>

<main id="contenido" aria-busy={navigating.to ? 'true' : 'false'}>
	{@render children()}
</main>

<footer class="pie">
	<div class="contenedor pie-rejilla">
		<div>
			<p class="pie-titulo">Observatorio de Legislación de Género</p>
			<p>
				Es un proyecto independiente y sin fines de lucro, y su
				<a href="https://github.com/pedroaravenam/observatorio-legislacion-genero"
					>código es abierto</a
				>, con licencia AGPL-3.0.
			</p>
		</div>
		<div>
			<p class="pie-titulo">Datos</p>
			<p>
				{#if consultado}
					La tramitación se consultó al Senado por última vez el {consultado}
				{:else}
					No está disponible la fecha de la última consulta al Senado.
				{/if}
				Los datos provienen del Senado de la República y de la Biblioteca del Congreso Nacional, instituciones
				que no patrocinan ni operan este sitio.
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
		z-index: 10;
	}
	.cabecera {
		position: relative;
		background: var(--franja);
		color: var(--franja-texto);
		border-bottom: 1px solid rgb(255 255 255 / 0.1);
	}
	.fila {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem 1.5rem;
		padding-top: 0.7rem;
		padding-bottom: 0.7rem;
	}
	.marca {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		min-height: 44px;
		color: inherit;
		text-decoration: none;
	}
	.sello {
		flex: none;
		border-radius: 6px;
		box-shadow: 0 0 0 1px rgb(255 255 255 / 0.2);
	}
	.nombre {
		display: flex;
		flex-direction: column;
		font-family: var(--serif);
		line-height: 1.1;
	}
	.nombre-1 {
		font-size: 0.88rem;
		color: var(--franja-suave);
	}
	.nombre-2 {
		font-size: 1.2rem;
		font-weight: 600;
	}
	nav {
		display: flex;
		gap: 0.25rem;
		margin-left: -0.85rem;
	}
	@media (min-width: 40rem) {
		nav {
			margin-left: 0;
		}
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.85rem;
		color: var(--franja-texto);
		text-decoration: none;
		font-weight: 500;
		white-space: nowrap;
	}
	@media (max-width: 30rem) {
		nav a {
			padding: 0 0.6rem;
			font-size: 0.95rem;
		}
		nav {
			margin-left: -0.6rem;
		}
	}
	nav a:hover {
		background: rgb(255 255 255 / 0.08);
	}
	nav a[aria-current='page'] {
		box-shadow: inset 0 -3px 0 var(--barra-ley);
		font-weight: 600;
	}
	.progreso {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 3px;
		width: 40%;
		background: var(--barra-ley);
		animation: avance 1s ease-in-out infinite;
	}
	@keyframes avance {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(250%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.progreso {
			animation: none;
			width: 100%;
			opacity: 0.6;
		}
	}
	main {
		min-height: 60vh;
		padding-bottom: 4rem;
	}
	.pie {
		border-top: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--tinta-suave);
		font-size: 0.9rem;
		padding: 2rem 0 2.5rem;
	}
	.pie-rejilla {
		display: grid;
		gap: 1rem 3rem;
	}
	@media (min-width: 48rem) {
		.pie-rejilla {
			grid-template-columns: 1fr 2fr;
		}
	}
	.pie p {
		margin: 0 0 0.4rem;
		max-width: 62ch;
	}
	.pie-titulo {
		font-family: var(--serif);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--tinta);
	}
</style>
