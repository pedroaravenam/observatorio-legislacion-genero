<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title
		>{page.status === 404 ? 'No encontrado' : 'Error'} · Observatorio de Legislación de Género</title
	>
</svelte:head>

<section class="contenedor error" role="alert">
	<h1>{page.status === 404 ? 'No encontramos esta página' : 'No pudimos cargar esta página'}</h1>
	<p>
		{#if page.status === 404 && (!page.error?.message || page.error.message === 'Not Found')}
			La dirección no corresponde a ninguna página del Observatorio. Puede que el enlace esté
			incompleto o que la página haya cambiado de lugar.
		{:else}
			{page.error?.message ?? 'Ocurrió un error inesperado al preparar la página.'}
		{/if}
	</p>
	{#if page.status !== 404}
		<p>
			Vuelve a intentarlo en unos minutos. Si el problema continúa, lo más probable es que el sitio
			esté en mantención.
		</p>
	{/if}
	<p><a class="boton" href="/">Ir a los proyectos</a></p>
</section>

<style>
	.error {
		padding-top: 3rem;
		padding-bottom: 2rem;
	}
	.error > :global(*) {
		max-width: 40rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(1.8rem, 4.5vw, 2.6rem);
		margin-top: 0;
	}
</style>
