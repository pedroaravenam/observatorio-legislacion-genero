<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page, navigating } from '$app/state';
	import { fechaHoraChile } from '#lib/formato';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const consultado = $derived(fechaHoraChile(data.senadoConsultado));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<a class="saltar visualmente-oculto" href="#contenido">Saltar al contenido</a>

<header class="cabecera">
	<div class="contenedor fila">
		<a class="marca" href="/">
			<span class="marca-nombre">Observatorio de Legislación de Género</span>
			<span class="marca-sub">Proyectos de ley en Chile, con su fuente oficial</span>
		</a>
		<nav aria-label="Principal">
			<a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>Proyectos</a>
			<a href="/acerca" aria-current={page.url.pathname === '/acerca' ? 'page' : undefined}
				>Cómo funciona</a
			>
		</nav>
	</div>
	{#if navigating.to}
		<div class="progreso" role="progressbar" aria-label="Cargando"></div>
	{/if}
</header>

<main id="contenido" class="contenedor" aria-busy={navigating.to ? 'true' : 'false'}>
	{@render children()}
</main>

<footer class="pie">
	<div class="contenedor">
		<p>
			{#if consultado}
				Datos de tramitación consultados al Senado el {consultado}.
			{:else}
				Fecha de la última consulta a las fuentes no disponible.
			{/if}
			Fuentes oficiales: Senado de la República, Cámara de Diputadas y Diputados y Biblioteca del Congreso
			Nacional. Estas instituciones no patrocinan ni operan este sitio.
		</p>
		<p>
			Proyecto independiente.
			<a href="https://github.com/pedroaravenam/observatorio-legislacion-genero">Código abierto</a> bajo
			licencia AGPL-3.0.
		</p>
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
		z-index: 10;
	}
	.cabecera {
		background: var(--superficie);
		border-bottom: 1px solid var(--borde);
		position: relative;
	}
	.fila {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		padding-top: 0.9rem;
		padding-bottom: 0.9rem;
	}
	.marca {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: var(--texto);
	}
	.marca-nombre {
		font-weight: 700;
		font-size: 1.15rem;
		color: var(--acento);
	}
	.marca-sub {
		font-size: 0.9rem;
		color: var(--texto-suave);
	}
	nav {
		display: flex;
		gap: 0.25rem;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.8rem;
		border-radius: var(--radio);
		text-decoration: none;
		font-weight: 600;
	}
	nav a[aria-current='page'] {
		background: var(--acento-suave);
	}
	.progreso {
		position: absolute;
		left: 0;
		bottom: -1px;
		height: 3px;
		width: 40%;
		background: var(--acento);
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
		padding-top: 1.5rem;
		padding-bottom: 3rem;
		min-height: 60vh;
	}
	.pie {
		border-top: 1px solid var(--borde);
		background: var(--superficie);
		color: var(--texto-suave);
		font-size: 0.9rem;
		padding: 1.25rem 0;
	}
</style>
