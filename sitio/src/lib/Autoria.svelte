<script lang="ts">
	import { APORTES, aportesDisponibles, AUTOR, CONTACTO, REPOSITORIO } from '#lib/sitio';

	const canales = aportesDisponibles(APORTES);
</script>

<div class="autoria">
	<div class="quien">
		<p>
			El Observatorio de Legislación de Género es un proyecto independiente y sin fines de lucro,
			desarrollado por {AUTOR.nombre}. Busca mantener al día el seguimiento de las iniciativas de
			género en el Congreso de Chile y dejarlo al alcance de cualquier persona. No lo patrocinan ni
			lo operan el Senado, la Cámara ni la Biblioteca del Congreso Nacional, que son sus fuentes.
		</p>
		{#if AUTOR.resena}
			<p>
				{AUTOR.resena}
				<a href={AUTOR.linkedin} rel="noopener">{AUTOR.nombre} en LinkedIn</a>.
			</p>
		{/if}
		<p>
			El <a href={REPOSITORIO}>código es abierto</a> y el criterio con que se eligen los proyectos
			está publicado en <a href="/acerca">Cómo funciona</a>, para que cualquiera pueda revisarlo y
			discutirlo.
		</p>
	</div>

	<div class="lado">
		<section aria-labelledby="contacto-titulo">
			<h3 id="contacto-titulo">Contacto</h3>
			<p>
				Para avisar de un error, proponer una corrección o preguntar por los datos, escribe a
				<a href="mailto:{CONTACTO}">{CONTACTO}</a>.
			</p>
		</section>

		<section id="apoyo" aria-labelledby="apoyo-titulo">
			<h3 id="apoyo-titulo">Apoya el mantenimiento</h3>
			<p>
				El sitio no tiene publicidad. Mantenerlo al día tiene costos: el servidor, el dominio y el
				trabajo de revisar los proyectos que ingresan.
			</p>
			{#if canales.length > 0}
				<ul class="canales">
					{#each canales as c (c.clave)}
						<li>
							<a class="boton secundario" href={c.url} rel="noopener">Aportar con {c.nombre}</a>
							<span class="detalle">{c.detalle}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p>
					Estamos habilitando los canales para recibir aportes. Si quieres apoyar desde ya, escribe
					a <a href="mailto:{CONTACTO}?subject=Quiero%20apoyar%20el%20Observatorio">{CONTACTO}</a>.
				</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.autoria {
		display: grid;
		gap: 1.5rem 4rem;
	}
	@media (min-width: 62rem) {
		.autoria {
			grid-template-columns: minmax(0, 38rem) minmax(0, 22rem);
		}
	}
	p {
		margin: 0 0 1rem;
		max-width: 68ch;
	}
	.quien p {
		font-size: 1.05rem;
	}
	.lado {
		display: grid;
		gap: 1.5rem;
		align-content: start;
	}
	h3 {
		font-family: var(--serif);
		font-size: 1.15rem;
		margin: 0 0 0.4rem;
	}
	.lado p {
		font-size: 0.95rem;
		color: var(--tinta-suave);
	}
	.lado p a {
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.canales {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	.canales li {
		display: grid;
		gap: 0.25rem;
		justify-items: start;
	}
	.detalle {
		font-size: 0.88rem;
		color: var(--tinta-suave);
	}
</style>
