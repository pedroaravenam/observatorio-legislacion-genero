<script lang="ts">
	import GraficoAnual from '../../lib/GraficoAnual.svelte';
	import { fechaLarga, NIVELES_RELACION } from '#lib/formato';
	import { TEMAS } from '#lib/temas';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const d = $derived(data.panorama);
	const actualizado = $derived(fechaLarga(data.senadoConsultado));
	const numero = new Intl.NumberFormat('es-CL');
	const n = (x: number) => numero.format(x);
	const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

	/** Días expresados en meses o años, redondeados, para leer de corrido. */
	function duracion(dias: number | null): string {
		if (dias === null) return 'sin datos';
		const meses = Math.round(dias / 30.44);
		if (meses < 1) return 'menos de un mes';
		if (meses < 12) return meses === 1 ? 'un mes' : `${meses} meses`;
		const annos = Math.floor(meses / 12);
		const resto = meses % 12;
		const a = annos === 1 ? 'un año' : `${annos} años`;
		if (resto === 0) return a;
		return `${a} y ${resto === 1 ? 'un mes' : `${resto} meses`}`;
	}

	const g = $derived(d.autoria.global);
	const filasAutoria = [
		{ clave: 'mujeres', nombre: 'Solo mujeres' },
		{ clave: 'mixta', nombre: 'Mujeres y hombres' },
		{ clave: 'hombres', nombre: 'Solo hombres' },
		{ clave: 'sinDato', nombre: 'Sin autores o sin sexo conocido' }
	] as const;
	const maxAutoria = $derived(
		Math.max(
			1,
			...d.autoria.porPeriodo.flatMap((p) => filasAutoria.map((f) => pct(p[f.clave], p.total)))
		)
	);
	const maxTema = $derived(Math.max(1, ...d.temas.map((t) => t.total)));
	const maxAutor = $derived(Math.max(1, ...d.autores.map((a) => a.total)));
	const mensaje = $derived(d.origen.find((o) => o.iniciativa === 'Mensaje')!);
	const mocion = $derived(d.origen.find((o) => o.iniciativa === 'Moción')!);
	const nombreTema = (clave: string) => TEMAS.find((t) => t.clave === clave)?.nombre ?? clave;
	// Temas ordenados como en el gráfico principal, para que la tabla por período se lea igual.
	const ordenTemas = $derived(d.temas.map((t) => t.clave));
	const maxCelda = $derived(
		Math.max(
			1,
			...d.periodos.flatMap((p) => ordenTemas.map((c) => pct(p.porTema[c] ?? 0, p.total)))
		)
	);
	const maxNivel = $derived(Math.max(1, ...d.niveles.map((x) => x.total)));
	const t = $derived(d.enTramite);
	const NOMBRE_NIVEL = {
		tema_central: 'Relación alta',
		componente: 'Relación media',
		debil: 'Relación débil'
	} as const;
	const tramosMovimiento = $derived([
		{ nombre: 'Durante el último año', total: t.movimiento.reciente },
		{ nombre: 'Hace entre uno y tres años', total: t.movimiento.medio },
		{ nombre: 'Hace más de tres años', total: t.movimiento.antiguo }
	]);
	const etapas = $derived([
		{ nombre: 'Primer trámite constitucional', total: t.primerTramite },
		{ nombre: 'Segundo trámite constitucional', total: t.segundoTramite },
		{ nombre: 'Etapas posteriores', total: t.otrasEtapas }
	]);
	const INDICE = [
		['annos', 'Cada año'],
		['niveles', 'Relación con el género'],
		['origen', 'Quién los presenta'],
		['autoria', 'Mujeres y hombres'],
		['temas', 'Temas'],
		['periodos', 'Cambio de los temas'],
		['abiertos', 'En tramitación'],
		['tiempo', 'Cuánto tardan'],
		['autores', 'Quiénes presentan más']
	] as const;
	/** Nombre en el orden habitual: «Apellidos, Nombre» pasa a «Nombre Apellidos». */
	const nombrePersona = (x: string) => {
		const [apellidos, nombre] = x.split(',').map((s) => s.trim());
		return nombre ? `${nombre} ${apellidos}` : x;
	};
</script>

{#snippet pie()}
	<p class="pie-datos">
		Fuente: servicio de tramitación del Senado de Chile.{#if actualizado}{' '}Datos al {actualizado}.{/if}
	</p>
{/snippet}

<svelte:head>
	<title>Panorama · Observatorio de Legislación de Género</title>
	<meta
		name="description"
		content="Temas, autores, origen y tiempos de tramitación de los proyectos de ley sobre género presentados en Chile desde 1990."
	/>
</svelte:head>

<section class="franja" aria-labelledby="titulo">
	<div class="contenedor">
		<h1 id="titulo">Panorama de la legislación de género</h1>
		<p class="bajada">
			De los {n(d.total)} proyectos sobre género presentados desde 1990, {n(d.leyes)} ya son ley y
			{n(d.enTramitacion)} siguen en tramitación, mientras que los {n(d.cerrados)} restantes se archivaron,
			se retiraron o fueron rechazados. Estas cifras se recalculan cada vez que se actualizan los datos.
		</p>
		<div
			class="estados"
			data-cifra="estados"
			data-total={d.total}
			data-leyes={d.leyes}
			data-tramitacion={d.enTramitacion}
			data-cerrados={d.cerrados}
			role="img"
			aria-label="{n(d.leyes)} son ley, {n(d.enTramitacion)} en tramitación y {n(
				d.cerrados
			)} cerrados sin ser ley"
		>
			<span class="e-ley" style="flex-grow: {d.leyes}"></span>
			<span class="e-tramitacion" style="flex-grow: {d.enTramitacion}"></span>
			<span class="e-cerrado" style="flex-grow: {d.cerrados}"></span>
		</div>
		<ul class="estados-leyenda" aria-hidden="true">
			<li><span class="clave e-ley"></span>Ley publicada · {pct(d.leyes, d.total)} %</li>
			<li>
				<span class="clave e-tramitacion"></span>En tramitación · {pct(d.enTramitacion, d.total)} %
			</li>
			<li>
				<span class="clave e-cerrado"></span>Cerrado sin ser ley · {pct(d.cerrados, d.total)} %
			</li>
		</ul>
		<nav class="indice" aria-labelledby="indice-titulo">
			<h2 id="indice-titulo">En esta página</h2>
			<ol>
				{#each INDICE as [ancla, nombre] (ancla)}
					<li><a href="#{ancla}">{nombre}</a></li>
				{/each}
			</ol>
		</nav>
	</div>
</section>

<div class="contenedor cuerpo">
	<section aria-labelledby="annos-titulo" class="bloque" id="annos">
		<h2 id="annos-titulo">Cuántos proyectos se presentan cada año</h2>
		<p class="intro">
			Cada barra es un año de ingreso. La parte verde muestra los proyectos de ese año que hoy son
			ley; los años recientes tienen menos porque sus proyectos todavía se tramitan. Al elegir un
			año se abre la lista de sus proyectos.
		</p>
		<div class="lamina">
			<GraficoAnual resumen={data.resumen} seleccionado={null} />
		</div>
		{@render pie()}
	</section>

	<section aria-labelledby="niveles-titulo" class="bloque" id="niveles">
		<h2 id="niveles-titulo">Qué tan de género es cada proyecto</h2>
		<p class="intro">
			El Observatorio ordena la selección en tres niveles según cuánto pesa el género en lo que el
			proyecto regula. La barra completa indica los proyectos de cada nivel y el tramo verde, los
			que ya son ley.
		</p>
		<ul class="barras-h">
			{#each d.niveles as x (x.clave)}
				<li
					class="fila-barra estatica"
					data-cifra="nivel"
					data-clave={x.clave}
					data-total={x.total}
					data-leyes={x.leyes}
				>
					<span class="b-nombre">
						{NOMBRE_NIVEL[x.clave]}
						<span class="b-explicacion">{NIVELES_RELACION[x.clave].explicacion}</span>
					</span>
					<span class="b-pista" aria-hidden="true">
						<span class="b-total" style="width: {(x.total / maxNivel) * 100}%">
							<span class="b-ley" style="width: {pct(x.leyes, x.total)}%"></span>
						</span>
					</span>
					<span class="b-valor">
						{n(x.total)}
						<span class="suave">· {n(x.leyes)} {x.leyes === 1 ? 'ley' : 'leyes'}</span>
					</span>
				</li>
			{/each}
		</ul>
		<p class="nota">
			<a href="/acerca#criterio">Cómo funciona</a> explica cada nivel y da ejemplos.
		</p>
		{@render pie()}
	</section>

	<section aria-labelledby="origen-titulo" class="bloque origen" id="origen">
		<h2 id="origen-titulo">Quién los presenta y cuáles prosperan</h2>
		<p class="intro">
			Un proyecto puede nacer como mensaje, cuando lo envía la Presidencia de la República, o como
			moción, cuando lo presentan diputadas, diputados, senadoras o senadores. Las mociones son
			mayoría, pero los mensajes tienen una probabilidad mucho mayor de convertirse en ley, en parte
			porque el Ejecutivo puede darles urgencia y fijar la agenda del Congreso.
		</p>
		<div class="comparacion">
			{#each [mensaje, mocion] as o (o.iniciativa)}
				<article
					class="tarjeta-origen {o.iniciativa === 'Mensaje' ? 'mensaje' : 'mocion'}"
					data-cifra="origen"
					data-iniciativa={o.iniciativa}
					data-total={o.total}
					data-leyes={o.leyes}
					data-mediana={o.medianaDias ?? ''}
				>
					<h3>
						{o.iniciativa === 'Mensaje' ? 'Mensajes de la Presidencia' : 'Mociones parlamentarias'}
					</h3>
					<p class="cifra">
						<span class="porcentaje">{pct(o.leyes, o.total)} %</span>
						<span class="cifra-texto">llegó a ser ley</span>
					</p>
					<div class="proporcion" role="img" aria-label="{n(o.leyes)} de {n(o.total)} son ley">
						<span style="width: {pct(o.leyes, o.total)}%"></span>
					</div>
					<p class="detalle">
						{n(o.leyes)} de {n(o.total)} proyectos presentados. Los que se convirtieron en ley tardaron
						una mediana de {duracion(o.medianaDias)} desde su ingreso hasta su publicación.
					</p>
				</article>
			{/each}
		</div>
		<p
			class="nota"
			data-cifra="camaras"
			data-diputados={d.camaras.find((c) => c.camara !== 'Senado')?.total}
			data-senado={d.camaras.find((c) => c.camara === 'Senado')?.total}
		>
			Por cámara de origen,
			{#each d.camaras as c, i (c.camara)}{i > 0 ? ' y ' : ''}{n(c.total)} proyectos ingresaron por
				{c.camara === 'Senado' ? 'el Senado' : 'la Cámara de Diputadas y Diputados'}{/each}.
		</p>
		{@render pie()}
	</section>

	<section aria-labelledby="sexo-titulo" class="bloque" id="autoria">
		<h2 id="sexo-titulo">Quiénes firman las mociones: mujeres y hombres</h2>
		<p
			class="intro"
			data-cifra="autoria"
			data-total={g.total}
			data-mujeres={g.mujeres}
			data-hombres={g.hombres}
			data-mixta={g.mixta}
			data-sin-dato={g.sinDato}
			data-sin-autores={g.sinAutores}
		>
			De las {n(g.total)} mociones de la selección, {n(g.mujeres)} ({pct(g.mujeres, g.total)} %) las firman
			solo mujeres, {n(g.hombres)} ({pct(g.hombres, g.total)} %) solo hombres y
			{n(g.mixta)} ({pct(g.mixta, g.total)} %) mujeres y hombres a la vez.
			{#if g.sinDato > 0}En {n(g.sinDato)} no hay datos:
				{#if g.sinAutores > 0}el Senado no registra autores en {n(
						g.sinAutores
					)}{/if}{#if g.sinDato > g.sinAutores}{g.sinAutores > 0 ? ' y ' : ''}no se conoce el sexo
					de quienes firman {n(g.sinDato - g.sinAutores)}{/if}.{/if}
			Los mensajes de la Presidencia no se cuentan porque no tienen autoría parlamentaria.
		</p>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabla-desplazable" role="region" aria-labelledby="sexo-titulo" tabindex="0">
			<table class="tabla-periodos">
				<caption class="solo-lectores">Autoría de las mociones por período, en porcentaje</caption>
				<thead>
					<tr>
						<th scope="col">Quiénes firman</th>
						{#each d.autoria.porPeriodo as p (p.nombre)}
							<th scope="col" class="num">
								{p.nombre}<span class="th-total">{n(p.total)} mociones</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each filasAutoria as f (f.clave)}
						<tr>
							<th scope="row">{f.nombre}</th>
							{#each d.autoria.porPeriodo as p (p.nombre)}
								{@const v = pct(p[f.clave], p.total)}
								<td class="num" style="--intensidad: {v / maxAutoria}">{v} %</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="intro" data-cifra="autoria-leyes">
			De las mociones firmadas solo por mujeres, {n(d.autoria.leyes.mujeres)} ({pct(
				d.autoria.leyes.mujeres,
				g.mujeres
			)} %) ya son ley; de las firmadas solo por hombres, {n(d.autoria.leyes.hombres)} ({pct(
				d.autoria.leyes.hombres,
				g.hombres
			)} %), y de las que firman mujeres y hombres, {n(d.autoria.leyes.mixta)} ({pct(
				d.autoria.leyes.mixta,
				g.mixta
			)} %).
		</p>
		<p class="nota">
			El sexo de diputadas y diputados es el que informa la Cámara. Para senadoras y senadores, y
			para quienes ese servicio no incluye, se deriva de la reseña parlamentaria de la Biblioteca
			del Congreso Nacional o se corrige a mano, así que es un dato derivado; «Cómo funciona»
			explica el método. «Mujeres y hombres» significa que firma al menos una persona de cada sexo.
		</p>
		<p class="pie-datos">
			Fuentes: servicio de tramitación del Senado (autores), servicio de diputados de la Cámara y
			reseñas parlamentarias de la Biblioteca del Congreso Nacional (sexo).{#if actualizado}{' '}Datos
				al {actualizado}.{/if}
		</p>
	</section>

	<section aria-labelledby="temas-titulo" class="bloque" id="temas">
		<h2 id="temas-titulo">Temas</h2>
		<p class="intro">
			Cada proyecto se asigna a los temas que nombra su título, de modo que uno puede contar en
			varios. La barra completa indica los proyectos presentados y el tramo verde, los que ya son
			ley. Además, {n(d.sinTemaEnTitulo)} proyectos no tienen tema en su título, porque entraron a la
			selección por su texto o por el de la ley.
		</p>
		<ul class="barras-h">
			{#each d.temas as t (t.clave)}
				<li data-cifra="tema" data-clave={t.clave} data-total={t.total} data-leyes={t.leyes}>
					<a href="/proyectos?tema={t.clave}" class="fila-barra">
						<span class="b-nombre">{t.nombre}</span>
						<span class="b-pista" aria-hidden="true">
							<span class="b-total" style="width: {(t.total / maxTema) * 100}%">
								<span class="b-ley" style="width: {pct(t.leyes, t.total)}%"></span>
							</span>
						</span>
						<span class="b-valor">
							{n(t.total)}
							<span class="suave">· {n(t.leyes)} {t.leyes === 1 ? 'ley' : 'leyes'}</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
		<p class="nota">Cada tema enlaza a la lista de sus proyectos.</p>
		{@render pie()}
	</section>

	<section aria-labelledby="periodos-titulo" class="bloque" id="periodos">
		<h2 id="periodos-titulo">Cómo han cambiado los temas</h2>
		<p class="intro">
			La tabla muestra qué parte de los proyectos de cada período trató cada tema. Como un proyecto
			puede tener varios temas o ninguno, las columnas no suman 100 %. El último período parte en
			2018, el año de las movilizaciones feministas, desde el cual la cantidad de proyectos creció
			con fuerza.
		</p>
		<!-- La región se desplaza en pantallas angostas; el foco permite moverla con el teclado. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div class="tabla-desplazable" role="region" aria-labelledby="periodos-titulo" tabindex="0">
			<table class="tabla-periodos">
				<thead>
					<tr>
						<th scope="col">Tema</th>
						{#each d.periodos as p (p.nombre)}
							<th
								scope="col"
								class="num"
								data-cifra="periodo"
								data-nombre={p.nombre}
								data-total={p.total}
							>
								{p.nombre}<span class="th-total">{n(p.total)} proyectos</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each ordenTemas as clave (clave)}
						<tr>
							<th scope="row">{nombreTema(clave)}</th>
							{#each d.periodos as p (p.nombre)}
								{@const v = pct(p.porTema[clave] ?? 0, p.total)}
								<td class="num" style="--intensidad: {v / maxCelda}">{v} %</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{@render pie()}
	</section>

	<section aria-labelledby="abiertos-titulo" class="bloque" id="abiertos">
		<h2 id="abiertos-titulo">Dónde están los proyectos en tramitación</h2>
		<p
			class="intro"
			data-cifra="abiertos"
			data-total={t.total}
			data-primer={t.primerTramite}
			data-segundo={t.segundoTramite}
			data-antiguo={t.movimiento.antiguo}
		>
			{n(t.total)} proyectos siguen formalmente abiertos. El primer trámite ocurre en la cámara donde
			se presentó el proyecto y el segundo, en la otra. Un proyecto puede seguir «en tramitación» durante
			años sin que nadie lo mueva, por eso se muestra también cuándo fue su último trámite.
		</p>
		<div class="pares">
			<div>
				<h3>Etapa en que están</h3>
				<dl class="medidas">
					{#each etapas as e (e.nombre)}
						<div>
							<dt>{e.nombre}</dt>
							<dd>
								<span class="m-pista" aria-hidden="true"
									><span style="width: {pct(e.total, t.total)}%"></span></span
								>
								<span class="m-valor"
									>{n(e.total)} <span class="suave">· {pct(e.total, t.total)} %</span></span
								>
							</dd>
						</div>
					{/each}
				</dl>
			</div>
			<div>
				<h3>Cuándo fue su último trámite</h3>
				<dl class="medidas">
					{#each tramosMovimiento as e (e.nombre)}
						<div>
							<dt>{e.nombre}</dt>
							<dd>
								<span class="m-pista" aria-hidden="true"
									><span style="width: {pct(e.total, t.total)}%"></span></span
								>
								<span class="m-valor"
									>{n(e.total)} <span class="suave">· {pct(e.total, t.total)} %</span></span
								>
							</dd>
						</div>
					{/each}
				</dl>
			</div>
		</div>
		<p class="nota">
			<a href="/actualidad">Actualidad</a> muestra los trámites de los últimos días.
		</p>
		{@render pie()}
	</section>

	<section aria-labelledby="tiempo-titulo" class="bloque" id="tiempo">
		<h2 id="tiempo-titulo">Cuánto tarda un proyecto en ser ley</h2>
		<p class="intro">
			Entre los proyectos que llegaron a publicarse, esta es la mediana del tiempo que pasó desde su
			ingreso hasta su publicación en el Diario Oficial, según el período en que se presentaron. Los
			más recientes tienden a mostrar plazos más cortos, ya que los que siguen en trámite aún no
			cuentan.
		</p>
		<dl class="tiempos">
			{#each d.tiempoPorPeriodo as t (t.nombre)}
				<div
					data-cifra="tiempo"
					data-nombre={t.nombre}
					data-leyes={t.leyes}
					data-mediana={t.medianaDias ?? ''}
				>
					<dt>{t.nombre}</dt>
					<dd>
						<span class="tiempo">{duracion(t.medianaDias)}</span>
						<span class="suave">{n(t.leyes)} {t.leyes === 1 ? 'ley' : 'leyes'}</span>
					</dd>
				</div>
			{/each}
		</dl>
		{@render pie()}
	</section>

	<section aria-labelledby="autores-titulo" class="bloque" id="autores">
		<h2 id="autores-titulo">Quiénes han presentado más proyectos</h2>
		<p class="intro">
			{n(d.totalAutores)} parlamentarias y parlamentarios firman al menos un proyecto de la selección.
			La lista muestra a quienes firman más, y cada proyecto cuenta para todas las personas que lo firmaron.
			Los {n(d.sinAutores)} proyectos sin autores registrados corresponden, en su mayoría, a mensajes
			de la Presidencia.
		</p>
		<ol class="autores">
			{#each d.autores as a, i (a.nombre)}
				<li data-cifra="autor" data-nombre={a.nombre} data-total={a.total} data-leyes={a.leyes}>
					<span class="a-pos" aria-hidden="true">{i + 1}</span>
					<a class="a-nombre" href="/proyectos?autor={encodeURIComponent(a.nombre)}"
						>{nombrePersona(a.nombre)}</a
					>
					<span class="b-pista" aria-hidden="true">
						<span class="b-total" style="width: {(a.total / maxAutor) * 100}%">
							<span class="b-ley" style="width: {pct(a.leyes, a.total)}%"></span>
						</span>
					</span>
					<span class="b-valor">
						{n(a.total)}
						<span class="suave">· {n(a.leyes)} {a.leyes === 1 ? 'ley' : 'leyes'}</span>
					</span>
				</li>
			{/each}
		</ol>
		<p class="nota">
			Los nombres aparecen tal como los registra el Senado, y cada uno enlaza a la lista de sus
			proyectos.
		</p>
		{@render pie()}
	</section>

	<p class="metodo">
		Las cifras se calculan sobre la selección de género descrita en
		<a href="/acerca">Cómo funciona</a>, con los datos de tramitación del Senado.
	</p>
</div>

<style>
	.pie-datos {
		margin: 1rem 0 0;
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.franja {
		background: var(--franja);
		color: var(--franja-texto);
		padding: 2.25rem 0 2rem;
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2rem, 5vw, 3.1rem);
		line-height: 1.08;
		margin: 0 0 0.8rem;
		max-width: 22ch;
	}
	.bajada {
		max-width: 62ch;
		color: var(--franja-suave);
		font-size: 1.08rem;
		margin: 0 0 1.5rem;
	}
	.estados {
		display: flex;
		height: 14px;
		border-radius: 4px;
		overflow: hidden;
		gap: 2px;
		max-width: 46rem;
	}
	.estados span {
		flex-basis: 0;
	}
	.e-ley {
		background: var(--barra-ley);
	}
	.e-tramitacion {
		background: var(--barra);
	}
	.e-cerrado {
		background: rgb(255 255 255 / 0.32);
	}
	.estados-leyenda {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 1.4rem;
		list-style: none;
		padding: 0;
		margin: 0.7rem 0 0;
		font-size: 0.92rem;
		color: var(--franja-suave);
	}
	.clave {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
		margin-right: 0.4rem;
		vertical-align: -0.05rem;
	}
	.indice {
		margin-top: 1.75rem;
		border-top: 1px solid var(--franja-linea);
		padding-top: 1rem;
	}
	.indice h2 {
		font-family: var(--sans);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--franja-suave);
		margin: 0 0 0.3rem;
	}
	.indice ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.6rem;
	}
	.indice a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--franja-texto);
		text-decoration-color: var(--franja-linea);
	}
	.indice a:hover {
		text-decoration-color: currentColor;
	}
	.lamina {
		max-width: 60rem;
		padding: clamp(1.1rem, 3vw, 2rem);
		border-radius: var(--radio-grande);
		background: var(--franja);
		color: var(--franja-texto);
		box-shadow: var(--sombra);
	}
	.fila-barra.estatica {
		align-items: start;
	}
	.fila-barra.estatica .b-pista {
		margin-top: 0.45rem;
	}
	.b-explicacion {
		display: block;
		font-weight: 400;
		font-size: 0.88rem;
		color: var(--tinta-suave);
	}
	.pares {
		display: grid;
		gap: 1.5rem 3rem;
		max-width: 60rem;
	}
	@media (min-width: 46rem) {
		.pares {
			grid-template-columns: 1fr 1fr;
		}
	}
	.pares h3 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}
	.medidas {
		margin: 0;
		display: grid;
		gap: 0.8rem;
	}
	.medidas dt {
		font-weight: 500;
		font-size: 0.95rem;
	}
	.medidas dd {
		margin: 0.25rem 0 0;
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 1rem;
	}
	.m-pista {
		height: 10px;
		border-radius: 5px;
		background: var(--violeta-suave);
		overflow: hidden;
	}
	.m-pista span {
		display: block;
		height: 100%;
		border-radius: 5px;
		background: var(--violeta-medio);
	}
	.m-valor {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		min-width: 6.5rem;
		text-align: right;
	}
	.cuerpo {
		padding-top: 0.5rem;
	}
	.bloque {
		padding: clamp(2rem, 5vw, 3rem) 0 1.25rem;
		border-bottom: 1px solid var(--borde);
	}
	.bloque:last-of-type {
		border-bottom: 0;
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(1.4rem, 3vw, 1.75rem);
		margin: 0 0 0.6rem;
	}
	.intro {
		max-width: 66ch;
		color: var(--tinta-suave);
		margin: 0 0 1.25rem;
	}
	.nota,
	.metodo {
		font-size: 0.92rem;
		color: var(--tinta-suave);
		max-width: 66ch;
	}
	.metodo {
		margin-top: 2rem;
	}
	.suave {
		color: var(--tinta-suave);
		font-weight: 400;
	}

	/* Mensajes y mociones */
	.comparacion {
		display: grid;
		gap: 1rem;
	}
	@media (min-width: 46rem) {
		.comparacion {
			grid-template-columns: 1fr 1fr;
			gap: 1.5rem;
		}
	}
	.tarjeta-origen {
		background: var(--superficie);
		border: 1px solid var(--borde);
		border-top: 4px solid var(--verde);
		border-radius: var(--radio-grande);
		box-shadow: var(--sombra);
		padding: 1.25rem 1.35rem 1.1rem;
	}
	.tarjeta-origen.mocion {
		border-top-color: var(--violeta-medio);
	}
	.tarjeta-origen h3 {
		font-size: 1rem;
		margin: 0 0 0.4rem;
	}
	.cifra {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin: 0 0 0.6rem;
	}
	.porcentaje {
		font-family: var(--serif);
		font-size: clamp(3rem, 8vw, 4.25rem);
		font-weight: 500;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--verde);
	}
	.mocion .porcentaje {
		color: var(--violeta-medio);
	}
	.cifra-texto {
		font-size: 1.05rem;
		color: var(--tinta-suave);
	}
	.proporcion {
		height: 10px;
		background: var(--violeta-suave);
		border-radius: 3px;
		overflow: hidden;
	}
	.proporcion span {
		display: block;
		height: 100%;
		background: var(--verde);
	}
	.detalle {
		margin: 0.75rem 0 0;
		font-size: 0.95rem;
	}

	/* Barras horizontales */
	.barras-h,
	.autores {
		list-style: none;
		padding: 0;
		margin: 0;
		max-width: 60rem;
	}
	.fila-barra,
	.autores li {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas: 'nombre valor' 'pista pista';
		gap: 0.25rem 1rem;
		align-items: center;
		padding: 0.55rem 0;
		min-height: 44px;
	}
	.fila-barra {
		color: inherit;
		text-decoration: none;
		border-radius: 3px;
	}
	.fila-barra:hover .b-nombre {
		text-decoration: underline;
		color: var(--violeta-medio);
	}
	.autores li {
		grid-template-columns: 1.75rem 1fr auto;
		grid-template-areas: 'pos nombre valor' '. pista pista';
		border-bottom: 1px solid var(--borde);
	}
	@media (min-width: 46rem) {
		.fila-barra {
			grid-template-columns: 17rem 1fr 9rem;
			grid-template-areas: 'nombre pista valor';
		}
		.autores li {
			grid-template-columns: 1.75rem 17rem 1fr 9rem;
			grid-template-areas: 'pos nombre pista valor';
		}
	}
	.b-nombre,
	.a-nombre {
		grid-area: nombre;
		font-weight: 500;
	}
	.a-nombre {
		color: var(--tinta);
		text-decoration: none;
		display: flex;
		align-items: center;
		min-height: 44px;
	}
	.a-nombre:hover {
		color: var(--violeta-medio);
		text-decoration: underline;
	}
	.a-pos {
		grid-area: pos;
		color: var(--tinta-suave);
		font-variant-numeric: tabular-nums;
		font-size: 0.9rem;
	}
	.b-pista {
		grid-area: pista;
		height: 12px;
		background: var(--violeta-suave);
		border-radius: 2px;
		overflow: hidden;
	}
	.b-total {
		display: block;
		height: 100%;
		background: var(--violeta-medio);
	}
	.b-ley {
		display: block;
		height: 100%;
		background: var(--verde);
	}
	.b-valor {
		grid-area: valor;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		white-space: nowrap;
	}

	/* Tabla por período */
	.tabla-desplazable {
		overflow-x: auto;
		max-width: 60rem;
	}
	.solo-lectores {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.tabla-periodos {
		width: 100%;
		min-width: 34rem;
		border-collapse: collapse;
		font-size: 0.95rem;
	}
	.tabla-periodos th,
	.tabla-periodos td {
		padding: 0.55rem 0.7rem;
		border-bottom: 1px solid var(--borde);
		text-align: left;
	}
	.tabla-periodos thead th {
		font-size: 0.88rem;
		color: var(--tinta-suave);
		vertical-align: bottom;
	}
	.tabla-periodos tbody th {
		font-weight: 500;
	}
	.th-total {
		display: block;
		font-weight: 400;
	}
	.num {
		text-align: right !important;
		font-variant-numeric: tabular-nums;
	}
	.tabla-periodos td {
		background: color-mix(in srgb, var(--violeta-medio) calc(var(--intensidad) * 32%), transparent);
	}

	/* Tiempos */
	.tiempos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 1rem;
		margin: 0;
		max-width: 60rem;
	}
	.tiempos div {
		border-top: 2px solid var(--verde);
		padding: 0.6rem 0 0.2rem;
	}
	.tiempos dt {
		font-size: 0.9rem;
		color: var(--tinta-suave);
	}
	.tiempos dd {
		margin: 0.15rem 0 0;
		display: flex;
		flex-direction: column;
	}
	.tiempo {
		font-family: var(--serif);
		font-size: 1.45rem;
		font-weight: 600;
		line-height: 1.2;
	}
</style>
