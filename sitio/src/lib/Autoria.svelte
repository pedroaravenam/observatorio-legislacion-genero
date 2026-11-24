<script lang="ts">
	import { APORTES, aportesDisponibles, AUTOR, CONTACTO, REPOSITORIO } from '#lib/sitio';

	const canales = aportesDisponibles(APORTES);
</script>

<div class="autoria">
	<div class="quien">
		{#if AUTOR.foto}
			<img
				class="foto"
				src={AUTOR.foto}
				alt="Retrato de {AUTOR.nombre}"
				width="640"
				height="800"
				loading="lazy"
			/>
		{/if}
		<p>{AUTOR.presentacion}</p>
		{#if AUTOR.resena}
			<p>
				{AUTOR.resena}
				Puedes conocer más sobre mi trayectoria en
				<a href={AUTOR.linkedin} rel="noopener">mi perfil de LinkedIn</a>.
			</p>
		{/if}
		<p>
			El Observatorio es un proyecto independiente y sin fines de lucro. Utiliza información del
			Senado, la Cámara de Diputadas y Diputados y la Biblioteca del Congreso Nacional, pero ninguna
			de estas instituciones lo patrocina ni lo administra.
		</p>
		<p>
			El código del sitio está disponible en un <strong
				><a href={REPOSITORIO}>repositorio público en GitHub</a></strong
			>. También puedes revisar los criterios de selección de los proyectos y la metodología en
			<a href="/acerca">Cómo funciona</a>. Ambos están abiertos a revisión y discusión.
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
	.quien {
		display: flow-root;
	}
	.quien p {
		font-size: 1.05rem;
	}
	.foto {
		display: block;
		float: left;
		width: 8rem;
		max-width: 35%;
		height: auto;
		aspect-ratio: 4 / 5;
		margin: 0.25rem 1.1rem 0.75rem 0;
		border-radius: var(--radio);
		object-fit: cover;
		border: 1px solid var(--borde);
	}
	@media (max-width: 30rem) {
		.foto {
			width: 6rem;
			margin-right: 1rem;
		}
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
