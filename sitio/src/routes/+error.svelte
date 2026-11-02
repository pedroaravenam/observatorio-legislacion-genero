<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title
		>{page.status === 404 ? 'No encontrado' : 'Error'} · Observatorio de Legislación de Género</title
	>
</svelte:head>

<section class="error" role="alert">
	<h1>{page.status === 404 ? 'No encontramos esta página' : 'No pudimos cargar esta página'}</h1>
	<p>{page.error?.message ?? 'Ocurrió un error inesperado.'}</p>
	{#if page.status !== 404}
		<p>
			Intenta de nuevo en unos minutos. Si el problema continúa, es probable que el servicio esté en
			mantención.
		</p>
	{/if}
	<p><a class="boton" href="/">Ir a los proyectos</a></p>
</section>

<style>
	.error {
		max-width: 40rem;
		padding: 1.5rem 0;
	}
	h1 {
		margin-top: 0;
	}
</style>
