<script lang="ts">
	import Autoria from '../lib/Autoria.svelte';
	import GraficoAnual from '../lib/GraficoAnual.svelte';
	import { fechaLarga } from '#lib/formato';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const d = $derived(data.panorama);
	const numero = new Intl.NumberFormat('es-CL');
	const decimal = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
	const n = (x: number) => numero.format(x);
	const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);

	const desde = $derived(data.resumen[0]?.anno ?? 1990);
	const ultimo = $derived(data.resumen.at(-1)?.anno ?? desde);
	const mayor = $derived(data.resumen.reduce((a, r) => (r.total > a.total ? r : a)));
	const primero = $derived(data.resumen[0]);
	const actualizado = $derived(fechaLarga(data.senadoConsultado));

	// Promedio anual de cada período, sobre los años que de verdad tienen datos.
	const periodos = $derived(
		d.periodos.map((p) => {
			const annos = Math.min(p.hasta, ultimo) - p.desde + 1;
			return { ...p, annos, promedio: annos > 0 ? p.total / annos : 0 };
		})
	);
	const reciente = $derived(periodos.at(-1)!);

	const mensaje = $derived(d.origen.find((o) => o.iniciativa === 'Mensaje')!);
	const mocion = $derived(d.origen.find((o) => o.iniciativa === 'Moción')!);
	const g = $derived(d.autoria.global);
	const temas = $derived(d.temas.slice(0, 6));
	const maxTema = $derived(Math.max(1, ...temas.map((t) => t.total)));
	const maxNivel = $derived(Math.max(1, ...d.niveles.map((x) => x.total)));
	const t = $derived(d.enTramite);

	const NIVELES = {
		tema_central: 'El género es el tema central',
		componente: 'El género es una parte del proyecto',
		debil: 'Relación débil'
	} as const;

	const INDICE = [
		['que-es', 'Qué cuenta como legislación de género'],
		['cuanto', 'Cuánto se legisla'],
		['hitos', 'Leyes que marcaron el período'],
		['quien', 'Quién presenta y qué prospera'],
		['temas', 'De qué tratan'],
		['hoy', 'En qué están hoy'],
		['proyecto', 'Quién hace este sitio']
	] as const;
</script>

<svelte:head>
	<title>Observatorio de Legislación de Género · Chile, desde {desde}</title>
	<meta
		name="description"
		content="Qué se ha legislado sobre género en Chile desde 1990: cuántos proyectos se presentan, quién los impulsa, de qué tratan y cuáles llegan a ser ley."
	/>
</svelte:head>

{#snippet fuente()}
	<p class="fuente">
		Fuente: servicio de tramitación del Senado de Chile.{#if actualizado}{' '}Datos al {actualizado}.{/if}
	</p>
{/snippet}

<section class="franja" aria-labelledby="titulo">
	<div class="contenedor">
		<h1 id="titulo">Más de tres décadas de legislación de género en Chile</h1>
		<p class="bajada">
			Desde {desde}, el Congreso ha recibido {n(d.total)} proyectos de ley que tratan temas de género.
			{n(d.leyes)} ya son ley, {n(d.enTramitacion)} siguen en tramitación y {n(d.cerrados)} se archivaron,
			se retiraron o fueron rechazados. Aquí se explica qué se ha legislado, quién lo impulsa y qué llega
			a aprobarse.
		</p>
		<p class="acciones">
			<a class="boton sobre-franja" href="/proyectos">Buscar proyectos</a>
			<a class="seguir" href="/panorama">Ver el panorama completo</a>
		</p>
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

<div class="contenedor ensayo">
	<section class="tramo" id="que-es" aria-labelledby="que-es-titulo">
		<div class="texto">
			<h2 id="que-es-titulo">Qué cuenta como legislación de género</h2>
			<p>
				No basta con que un proyecto mencione a las mujeres para considerarlo de género. El
				Observatorio mira qué regula cada proyecto y a quién afecta, y con eso lo ubica en uno de
				tres niveles: los proyectos donde el género es el tema central, aquellos donde es una parte
				de lo que se regula y aquellos donde la relación es lateral o dudosa. Estos últimos se
				incluyen, pero quedan marcados como relación débil.
			</p>
			<p>
				Con ese criterio, de los {n(data.totalBoletines)} boletines que el Observatorio ha cargado desde
				el servicio del Senado, {n(d.total)} forman la selección: {decimal.format(
					(d.total / data.totalBoletines) * 100
				)} de cada cien.
			</p>
			<p><a class="seguir" href="/acerca#criterio">Leer el criterio completo</a></p>
		</div>
		<aside class="margen" aria-label="La selección según su relación con el género">
			<p class="cifra">
				<span class="numero">{n(d.total)}</span>
				<span class="rotulo">proyectos en la selección, de {n(data.totalBoletines)} boletines</span>
			</p>
			<ul class="barras">
				{#each d.niveles as x (x.clave)}
					<li>
						<span class="b-nombre">{NIVELES[x.clave]}</span>
						<span class="b-valor">{n(x.total)}</span>
						<span class="b-pista" aria-hidden="true">
							<span class="b-total" style="width: {(x.total / maxNivel) * 100}%"></span>
						</span>
					</li>
				{/each}
			</ul>
		</aside>
	</section>

	<section class="tramo" id="cuanto" aria-labelledby="cuanto-titulo">
		<div class="texto">
			<h2 id="cuanto-titulo">Cada vez se presentan más proyectos</h2>
			<p>
				En {primero.anno} ingresaron {n(primero.total)} proyectos de género. En {mayor.anno}, el año
				con más ingresos, fueron {n(mayor.total)}. El aumento no fue parejo: durante la década de
				1990 el promedio era de {decimal.format(periodos[0].promedio)} proyectos al año, entre 2000 y
				2009 subió a {decimal.format(periodos[1].promedio)} y entre 2010 y 2017 llegó a
				{decimal.format(periodos[2].promedio)}.
			</p>
			<p>
				El cambio más marcado viene después. Desde {reciente.desde}, el año de las movilizaciones
				feministas, el promedio es de {decimal.format(reciente.promedio)} proyectos al año, y ese período
				reúne {n(reciente.total)} de los {n(d.total)} proyectos de toda la selección.
			</p>
			<p>
				Que se presenten más proyectos no significa que se aprueben más. De los ingresados desde
				{reciente.desde}, {n(reciente.leyes)} ya son ley; muchos de los más recientes siguen en tramitación
				y todavía pueden serlo.
			</p>
		</div>
		<aside class="margen" aria-label="Proyectos por período">
			<table class="tabla-margen">
				<caption>Proyectos presentados por período</caption>
				<thead>
					<tr>
						<th scope="col">Período</th>
						<th scope="col" class="num">Proyectos</th>
						<th scope="col" class="num">Por año</th>
					</tr>
				</thead>
				<tbody>
					{#each periodos as p (p.nombre)}
						<tr>
							<th scope="row">{p.nombre}</th>
							<td class="num">{n(p.total)}</td>
							<td class="num">{decimal.format(p.promedio)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="nota">{ultimo} es el año en curso y todavía no termina.</p>
		</aside>
		<div class="lamina">
			<GraficoAnual resumen={data.resumen} seleccionado={null} />
		</div>
		<div class="bajo-lamina">{@render fuente()}</div>
	</section>

	<section class="tramo" id="hitos" aria-labelledby="hitos-titulo">
		<div class="texto">
			<h2 id="hitos-titulo">Leyes que marcaron el período</h2>
			<p>
				De los {n(d.total)} proyectos, {n(d.leyes)} terminaron publicados como ley. Entre ellos hay reajustes
				y modificaciones acotadas, pero también leyes que cambiaron las reglas, como la primera ley de
				violencia intrafamiliar, la que incorporó el femicidio al Código Penal o la que permitió el matrimonio
				entre personas del mismo sexo.
			</p>
			<p>
				La lista que sigue es una selección del Observatorio, no un registro oficial. Cada ley
				enlaza a la tramitación completa del proyecto que le dio origen.
			</p>
			<ol class="hilo">
				{#each data.hitos as h (h.boletin)}
					<li>
						<span class="h-anno">{h.anno}</span>
						<a class="h-nombre" href="/boletin/{h.boletin}">{h.nombre}</a>
						<span class="h-ley">{h.ley}, publicada el {fechaLarga(h.publicada)}</span>
					</li>
				{/each}
			</ol>
		</div>
		<aside class="margen" aria-label="Proyectos que son ley">
			<p class="cifra">
				<span class="numero ley">{pct(d.leyes, d.total)} %</span>
				<span class="rotulo"
					>de los proyectos de la selección ya es ley: {n(d.leyes)} de {n(d.total)}</span
				>
			</p>
		</aside>
	</section>

	<section class="tramo" id="quien" aria-labelledby="quien-titulo">
		<div class="texto">
			<h2 id="quien-titulo">Quién presenta los proyectos y cuáles prosperan</h2>
			<p>
				Un proyecto puede nacer como mensaje, cuando lo envía la Presidencia de la República, o como
				moción, cuando lo presentan diputadas, diputados, senadoras o senadores. Las mociones son
				amplia mayoría: {n(mocion.total)} contra {n(mensaje.total)} mensajes. Pero el {pct(
					mensaje.leyes,
					mensaje.total
				)} % de los mensajes llegó a ser ley, frente al {pct(mocion.leyes, mocion.total)} % de las mociones,
				en parte porque el Ejecutivo puede darles urgencia y fijar la agenda del Congreso.
			</p>
			<p>
				Las mociones también dicen algo sobre quién legisla. De las {n(g.total)} mociones de la selección,
				el {pct(g.mixta, g.total)} % lleva firmas de mujeres y hombres a la vez, el {pct(
					g.hombres,
					g.total
				)} % solo de hombres y el {pct(g.mujeres, g.total)} % solo de mujeres.
			</p>
			<p><a class="seguir" href="/panorama#origen">Ver el detalle por período</a></p>
		</div>
		<aside class="margen" aria-label="Proyectos que llegaron a ser ley según su origen">
			<p class="rotulo-fuerte">Llegaron a ser ley</p>
			<ul class="barras">
				<li>
					<span class="b-nombre">Mensajes de la Presidencia</span>
					<span class="b-valor">{pct(mensaje.leyes, mensaje.total)} %</span>
					<span class="b-pista" aria-hidden="true">
						<span class="b-total ley" style="width: {pct(mensaje.leyes, mensaje.total)}%"></span>
					</span>
					<span class="b-detalle">{n(mensaje.leyes)} de {n(mensaje.total)}</span>
				</li>
				<li>
					<span class="b-nombre">Mociones parlamentarias</span>
					<span class="b-valor">{pct(mocion.leyes, mocion.total)} %</span>
					<span class="b-pista" aria-hidden="true">
						<span class="b-total ley" style="width: {pct(mocion.leyes, mocion.total)}%"></span>
					</span>
					<span class="b-detalle">{n(mocion.leyes)} de {n(mocion.total)}</span>
				</li>
			</ul>
		</aside>
	</section>

	<section class="tramo" id="temas" aria-labelledby="temas-titulo">
		<div class="texto">
			<h2 id="temas-titulo">De qué tratan</h2>
			<p>
				Cada proyecto se asigna a los temas que nombra su título, de modo que uno puede contar en
				varios. {temas[0].nombre} es el tema más frecuente, con {n(temas[0].total)} proyectos; le siguen
				{temas[1].nombre.toLowerCase()}, con {n(temas[1].total)}, y {temas[2].nombre.toLowerCase()},
				con
				{n(temas[2].total)}.
			</p>
			<p>
				Otros {n(d.sinTemaEnTitulo)} proyectos no tienen tema en su título, porque entraron a la selección
				por su texto o por el de la ley.
			</p>
			<p><a class="seguir" href="/panorama#temas">Ver todos los temas y cómo han cambiado</a></p>
		</div>
		<aside class="margen" aria-label="Temas más frecuentes">
			<p class="rotulo-fuerte">Temas más frecuentes</p>
			<ul class="barras">
				{#each temas as x (x.clave)}
					<li>
						<a class="b-nombre" href="/proyectos?tema={x.clave}">{x.nombre}</a>
						<span class="b-valor">{n(x.total)}</span>
						<span class="b-pista" aria-hidden="true">
							<span class="b-total" style="width: {(x.total / maxTema) * 100}%"></span>
						</span>
					</li>
				{/each}
			</ul>
		</aside>
	</section>

	<section class="tramo" id="hoy" aria-labelledby="hoy-titulo">
		<div class="texto">
			<h2 id="hoy-titulo">En qué están hoy</h2>
			<p>
				{n(d.enTramitacion)} proyectos siguen abiertos. De ellos, {n(t.primerTramite)} ({pct(
					t.primerTramite,
					t.total
				)} %) están todavía en su primer trámite constitucional, es decir, en la cámara donde se presentaron.
			</p>
			<p>
				Seguir en tramitación no siempre significa avanzar: {n(t.movimiento.antiguo)} de esos proyectos
				no registran ningún trámite hace más de tres años, aunque formalmente siguen abiertos. En cambio,
				{n(t.movimiento.reciente)} tuvieron algún movimiento durante el último año.
			</p>
			<p class="salidas">
				<a class="seguir" href="/actualidad">Ver lo que se movió estos días</a>
				<a class="seguir" href="/proyectos?estado=En+tramitaci%C3%B3n">Proyectos en tramitación</a>
			</p>
		</div>
		<aside class="margen" aria-label="Estado de los proyectos">
			<p class="rotulo-fuerte">Estado de los {n(d.total)} proyectos</p>
			<div class="estados" aria-hidden="true">
				<span class="e-ley" style="flex-grow: {d.leyes}"></span>
				<span class="e-tramitacion" style="flex-grow: {d.enTramitacion}"></span>
				<span class="e-cerrado" style="flex-grow: {d.cerrados}"></span>
			</div>
			<ul class="leyenda">
				<li><span class="clave e-ley"></span>Ley publicada <strong>{n(d.leyes)}</strong></li>
				<li>
					<span class="clave e-tramitacion"></span>En tramitación
					<strong>{n(d.enTramitacion)}</strong>
				</li>
				<li>
					<span class="clave e-cerrado"></span>Cerrado sin ser ley <strong>{n(d.cerrados)}</strong>
				</li>
			</ul>
		</aside>
	</section>

	<section class="tramo final" id="proyecto" aria-labelledby="proyecto-titulo">
		<h2 id="proyecto-titulo">Quién hace este sitio</h2>
		<Autoria />
	</section>
</div>

<style>
	/* Apertura */
	.franja {
		background: var(--franja);
		color: var(--franja-texto);
		padding: clamp(2.25rem, 6vw, 4rem) 0 clamp(1.75rem, 4vw, 2.5rem);
	}
	h1 {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2.2rem, 6vw, 4rem);
		line-height: 1.03;
		letter-spacing: -0.015em;
		max-width: 17ch;
		margin: 0 0 1.1rem;
	}
	.bajada {
		max-width: 62ch;
		margin: 0 0 1.5rem;
		font-size: clamp(1.05rem, 1.6vw, 1.18rem);
		color: var(--franja-suave);
	}
	.acciones {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1.5rem;
		margin: 0 0 2.25rem;
	}
	.boton.sobre-franja {
		background: var(--franja-texto);
		border-color: var(--franja-texto);
		color: var(--franja);
	}
	.boton.sobre-franja:hover {
		background: #ffffff;
		border-color: #ffffff;
	}
	.acciones .seguir {
		color: var(--franja-texto);
	}
	.indice {
		border-top: 1px solid var(--franja-linea);
		padding-top: 1.1rem;
	}
	.indice h2 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--franja-suave);
		margin: 0 0 0.4rem;
	}
	.indice ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0 2rem;
	}
	@media (min-width: 40rem) {
		.indice ol {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 62rem) {
		.indice ol {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
	.indice a {
		display: flex;
		align-items: center;
		min-height: 44px;
		color: var(--franja-texto);
		text-decoration-color: var(--franja-linea);
	}
	.indice a:hover {
		text-decoration-color: currentColor;
	}

	/* Ensayo: texto a la izquierda, cifras al margen */
	.tramo {
		display: grid;
		gap: 1.5rem 4rem;
		padding: clamp(2.5rem, 6vw, 4rem) 0 clamp(2rem, 5vw, 3.25rem);
		border-bottom: 1px solid var(--borde);
	}
	.tramo.final {
		border-bottom: 0;
		gap: 1.25rem;
	}
	@media (min-width: 62rem) {
		.tramo {
			grid-template-columns: minmax(0, 38rem) minmax(0, 22rem);
			align-items: start;
		}
		.tramo.final {
			grid-template-columns: 1fr;
		}
		.lamina,
		.bajo-lamina {
			grid-column: 1 / -1;
		}
	}
	h2 {
		font-family: var(--serif);
		font-weight: 600;
		font-size: clamp(1.55rem, 3.4vw, 2.1rem);
		line-height: 1.12;
		letter-spacing: -0.01em;
		margin: 0 0 1rem;
	}
	.texto p {
		font-size: 1.08rem;
		line-height: 1.62;
		margin: 0 0 1.05rem;
		max-width: 68ch;
	}
	.texto p:last-child {
		margin-bottom: 0;
	}
	.salidas {
		display: flex;
		flex-wrap: wrap;
		gap: 0 2rem;
	}

	/* Margen */
	.margen {
		padding-top: 0.35rem;
		border-top: 2px solid var(--violeta-medio);
	}
	@media (min-width: 62rem) {
		.margen {
			margin-top: 0.6rem;
		}
	}
	.cifra {
		display: grid;
		gap: 0.2rem;
		margin: 0.6rem 0 1.25rem;
	}
	.numero {
		font-family: var(--serif);
		font-weight: 500;
		font-size: clamp(2.6rem, 6vw, 3.4rem);
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--violeta);
	}
	.numero.ley {
		color: var(--verde);
	}
	.rotulo,
	.nota,
	.fuente {
		font-size: 0.9rem;
		color: var(--tinta-suave);
	}
	.rotulo-fuerte {
		margin: 0.7rem 0 0.6rem;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.nota {
		margin: 0.6rem 0 0;
	}
	.fuente {
		margin: 0;
	}
	.barras {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.85rem;
	}
	.barras li {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.3rem 1rem;
		align-items: baseline;
		font-size: 0.95rem;
	}
	.b-nombre {
		font-weight: 500;
	}
	a.b-nombre {
		color: var(--tinta);
		text-decoration-color: var(--borde-fuerte);
		padding: 0.35rem 0;
	}
	a.b-nombre:hover {
		color: var(--violeta-medio);
	}
	.b-valor {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.b-pista {
		grid-column: 1 / -1;
		height: 8px;
		border-radius: 4px;
		background: var(--violeta-suave);
		overflow: hidden;
	}
	.b-total {
		display: block;
		height: 100%;
		border-radius: 4px;
		background: var(--violeta-medio);
	}
	.b-total.ley {
		background: var(--verde);
	}
	.b-detalle {
		grid-column: 1 / -1;
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.tabla-margen {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
		margin-top: 0.5rem;
	}
	.tabla-margen caption {
		text-align: left;
		font-weight: 600;
		padding: 0.2rem 0 0.5rem;
	}
	.tabla-margen th,
	.tabla-margen td {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--borde);
		text-align: left;
		font-weight: 400;
	}
	.tabla-margen thead th {
		font-size: 0.85rem;
		color: var(--tinta-suave);
	}
	.tabla-margen .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
		padding-left: 1rem;
	}
	.tabla-margen tbody .num:last-child {
		font-weight: 600;
	}

	/* Lámina del gráfico anual */
	.lamina {
		margin-top: 0.75rem;
		padding: clamp(1.1rem, 3vw, 2rem);
		border-radius: var(--radio-grande);
		background: var(--franja);
		color: var(--franja-texto);
		box-shadow: var(--sombra);
	}

	/* Hitos: un hilo continuo con un nudo verde por cada ley */
	.hilo {
		list-style: none;
		margin: 1.75rem 0 0;
		padding: 0;
	}
	.hilo li {
		position: relative;
		display: grid;
		grid-template-columns: 3.4rem 1fr;
		gap: 0 1rem;
		padding: 0 0 1.35rem 1.6rem;
	}
	.hilo li:last-child {
		padding-bottom: 0;
	}
	.hilo li::before {
		content: '';
		position: absolute;
		left: 0.3rem;
		top: 0.55rem;
		bottom: -0.55rem;
		width: 2px;
		background: var(--borde-fuerte);
	}
	.hilo li:last-child::before {
		display: none;
	}
	.hilo li::after {
		content: '';
		position: absolute;
		left: 0;
		top: 0.4rem;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		background: var(--verde);
		box-shadow: 0 0 0 3px var(--papel);
	}
	.h-anno {
		grid-row: span 2;
		font-family: var(--serif);
		font-size: 1.2rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.3;
	}
	.h-nombre {
		font-weight: 600;
		color: var(--tinta);
		text-decoration-color: var(--borde-fuerte);
	}
	.h-nombre:hover {
		color: var(--violeta-medio);
		text-decoration-color: currentColor;
	}
	.h-ley {
		font-size: 0.9rem;
		color: var(--tinta-suave);
	}

	/* Estados */
	.estados {
		display: flex;
		height: 14px;
		gap: 2px;
		border-radius: 4px;
		overflow: hidden;
	}
	.estados span {
		flex-basis: 0;
	}
	.e-ley {
		background: var(--verde);
	}
	.e-tramitacion {
		background: var(--violeta-medio);
	}
	.e-cerrado {
		background: var(--cerrado);
	}
	.leyenda {
		list-style: none;
		margin: 0.8rem 0 0;
		padding: 0;
		display: grid;
		gap: 0.4rem;
		font-size: 0.95rem;
	}
	.leyenda li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.leyenda strong {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	.clave {
		flex: none;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
	}
</style>
