// Cifras del panel «Panorama», calculadas sobre la selección de género de la base pública.
import { TEMAS, temasDe } from '#lib/temas';
import type { Base } from '#lib/server/db';

interface FilaSeleccion {
	titulo: string;
	anno: number | null;
	iniciativa: string | null;
	camara_origen: string | null;
	estado: string | null;
	etapa: string | null;
	ultimo_tramite: string | null;
	grupo: string | null;
	fecha_ingreso: string | null;
	diario_oficial: string | null;
	autores: string;
	autoria: string;
}

export interface Conteo {
	total: number;
	leyes: number;
}

export interface CifraTema extends Conteo {
	clave: string;
	nombre: string;
	descripcion: string;
}

export interface Periodo {
	nombre: string;
	desde: number;
	hasta: number;
	total: number;
	/** Proyectos del período que hoy son ley publicada. */
	leyes: number;
	porTema: Record<string, number>;
}

export interface CifraOrigen extends Conteo {
	iniciativa: string;
	medianaDias: number | null;
}

export interface CifraAutor extends Conteo {
	nombre: string;
}

/**
 * Mociones según el sexo de quienes las firman. «sinDato» son las que no tienen ningún firmante con sexo conocido, y de ellas
 * «sinAutores» son las que el Senado registra sin autores.
 */
export interface CifraAutoria {
	nombre: string;
	total: number;
	mujeres: number;
	hombres: number;
	mixta: number;
	sinDato: number;
	sinAutores: number;
}

/** Proyectos según su nivel de relación con el género (ver NIVELES_RELACION). */
export interface CifraNivel extends Conteo {
	clave: 'tema_central' | 'componente' | 'debil';
	enTramitacion: number;
}

/** Dónde están los proyectos que siguen en tramitación y hace cuánto se movieron por última vez. */
export interface EnTramite {
	total: number;
	primerTramite: number;
	segundoTramite: number;
	otrasEtapas: number;
	/** Último trámite hace menos de un año, entre uno y tres años, y más de tres años; `sinFecha` si no hay trámites. */
	movimiento: { reciente: number; medio: number; antiguo: number; sinFecha: number };
}

export interface Panorama {
	total: number;
	leyes: number;
	enTramitacion: number;
	cerrados: number;
	temas: CifraTema[];
	sinTemaEnTitulo: number;
	periodos: Periodo[];
	origen: CifraOrigen[];
	camaras: (Conteo & { camara: string })[];
	autores: CifraAutor[];
	totalAutores: number;
	sinAutores: number;
	autoria: {
		global: CifraAutoria;
		porPeriodo: CifraAutoria[];
		/** Mociones que ya son ley, según quiénes las firman. */
		leyes: { mujeres: number; hombres: number; mixta: number };
	};
	niveles: CifraNivel[];
	enTramite: EnTramite;
	tiempoPorPeriodo: { nombre: string; leyes: number; medianaDias: number | null }[];
}

const PERIODOS: [string, number, number][] = [
	['1990–1999', 1990, 1999],
	['2000–2009', 2000, 2009],
	['2010–2017', 2010, 2017],
	['2018 en adelante', 2018, 9999]
];

function dias(desde: string, hasta: string): number {
	return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

function mediana(valores: number[]): number | null {
	if (valores.length === 0) return null;
	const v = [...valores].sort((a, b) => a - b);
	const m = Math.floor(v.length / 2);
	return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

const esLey = (f: FilaSeleccion) => f.estado === 'Publicado';

/** `hoy` (AAAA-MM-DD) es la fecha contra la que se mide hace cuánto se movió un proyecto. */
export function panorama(db: Base, hoy: string = new Date().toISOString().slice(0, 10)): Panorama {
	const filas = db
		.prepare(
			`SELECT p.titulo, p.anno, p.iniciativa, p.camara_origen, p.estado, p.etapa, p.ultimo_tramite,
			        g.grupo, p.fecha_ingreso, p.diario_oficial, p.autores, p.autoria
			 FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin`
		)
		.all() as unknown as FilaSeleccion[];

	const temasPorFila = filas.map((f) => temasDe(f.titulo));
	const plazo = (f: FilaSeleccion) =>
		esLey(f) && f.fecha_ingreso && f.diario_oficial
			? dias(f.fecha_ingreso, f.diario_oficial)
			: null;

	const temas = TEMAS.map((t) => {
		const c = filas.filter((_, i) => temasPorFila[i].includes(t.clave));
		return {
			clave: t.clave,
			nombre: t.nombre,
			descripcion: t.descripcion,
			total: c.length,
			leyes: c.filter(esLey).length
		};
	}).sort((a, b) => b.total - a.total);

	const periodos = PERIODOS.map(([nombre, desde, hasta]) => {
		const indices = filas
			.map((f, i) => (f.anno !== null && f.anno >= desde && f.anno <= hasta ? i : -1))
			.filter((i) => i >= 0);
		const porTema: Record<string, number> = {};
		for (const t of TEMAS)
			porTema[t.clave] = indices.filter((i) => temasPorFila[i].includes(t.clave)).length;
		return {
			nombre,
			desde,
			hasta,
			total: indices.length,
			leyes: indices.filter((i) => esLey(filas[i])).length,
			porTema
		};
	});

	const origen = ['Mensaje', 'Moción'].map((iniciativa) => {
		const c = filas.filter((f) => f.iniciativa === iniciativa);
		return {
			iniciativa,
			total: c.length,
			leyes: c.filter(esLey).length,
			medianaDias: mediana(c.map(plazo).filter((d): d is number => d !== null && d >= 0))
		};
	});

	const camaras = ['Cámara de Diputados', 'Senado'].map((camara) => {
		const c = filas.filter((f) => f.camara_origen === camara);
		return { camara, total: c.length, leyes: c.filter(esLey).length };
	});

	const porAutor = new Map<string, Conteo>();
	let sinAutores = 0;
	for (const f of filas) {
		const lista = JSON.parse(f.autores) as string[];
		if (lista.length === 0) sinAutores++;
		for (const nombre of lista) {
			const c = porAutor.get(nombre) ?? { total: 0, leyes: 0 };
			c.total++;
			if (esLey(f)) c.leyes++;
			porAutor.set(nombre, c);
		}
	}
	const autores = [...porAutor]
		.map(([nombre, c]) => ({ nombre, ...c }))
		.sort(
			(a, b) => b.total - a.total || b.leyes - a.leyes || a.nombre.localeCompare(b.nombre, 'es')
		)
		.slice(0, 15);

	const contarAutoria = (nombre: string, c: FilaSeleccion[]): CifraAutoria => ({
		nombre,
		total: c.length,
		mujeres: c.filter((f) => f.autoria === 'mujeres').length,
		hombres: c.filter((f) => f.autoria === 'hombres').length,
		mixta: c.filter((f) => f.autoria === 'mixta').length,
		sinDato: c.filter((f) => !['mujeres', 'hombres', 'mixta'].includes(f.autoria)).length,
		sinAutores: c.filter((f) => (JSON.parse(f.autores) as string[]).length === 0).length
	});
	const mociones = filas.filter((f) => f.iniciativa === 'Moción');
	const autoria = {
		global: contarAutoria('Todas', mociones),
		porPeriodo: PERIODOS.map(([nombre, desde, hasta]) =>
			contarAutoria(
				nombre,
				mociones.filter((f) => f.anno !== null && f.anno >= desde && f.anno <= hasta)
			)
		),
		leyes: {
			mujeres: mociones.filter((f) => f.autoria === 'mujeres' && esLey(f)).length,
			hombres: mociones.filter((f) => f.autoria === 'hombres' && esLey(f)).length,
			mixta: mociones.filter((f) => f.autoria === 'mixta' && esLey(f)).length
		}
	};

	const niveles = (['tema_central', 'componente', 'debil'] as const).map((clave) => {
		const c = filas.filter((f) => f.grupo === clave);
		return {
			clave,
			total: c.length,
			leyes: c.filter(esLey).length,
			enTramitacion: c.filter((f) => f.estado === 'En tramitación').length
		};
	});

	const abiertos = filas.filter((f) => f.estado === 'En tramitación');
	const primer = abiertos.filter((f) => f.etapa?.startsWith('Primer trámite')).length;
	const segundo = abiertos.filter((f) => f.etapa?.startsWith('Segundo trámite')).length;
	const movimiento = { reciente: 0, medio: 0, antiguo: 0, sinFecha: 0 };
	for (const f of abiertos) {
		if (!f.ultimo_tramite) movimiento.sinFecha++;
		else {
			const d = dias(f.ultimo_tramite, hoy);
			if (d < 365) movimiento.reciente++;
			else if (d < 365 * 3) movimiento.medio++;
			else movimiento.antiguo++;
		}
	}
	const enTramite = {
		total: abiertos.length,
		primerTramite: primer,
		segundoTramite: segundo,
		otrasEtapas: abiertos.length - primer - segundo,
		movimiento
	};

	const tiempoPorPeriodo = PERIODOS.map(([nombre, desde, hasta]) => {
		const d = filas
			.filter((f) => f.anno !== null && f.anno >= desde && f.anno <= hasta)
			.map(plazo)
			.filter((x): x is number => x !== null && x >= 0);
		return { nombre, leyes: d.length, medianaDias: mediana(d) };
	});

	return {
		total: filas.length,
		leyes: filas.filter(esLey).length,
		enTramitacion: filas.filter((f) => f.estado === 'En tramitación').length,
		cerrados: filas.filter((f) => f.estado !== 'Publicado' && f.estado !== 'En tramitación').length,
		temas,
		sinTemaEnTitulo: temasPorFila.filter((t) => t.length === 0).length,
		periodos,
		origen,
		camaras,
		autores,
		totalAutores: porAutor.size,
		sinAutores,
		autoria,
		niveles,
		enTramite,
		tiempoPorPeriodo
	};
}
