// Cifras del panel «Panorama», calculadas sobre la selección de género de la base pública.
import { TEMAS, temasDe } from '#lib/temas';
import type { Base } from '#lib/server/db';

interface FilaSeleccion {
	titulo: string;
	anno: number | null;
	iniciativa: string | null;
	camara_origen: string | null;
	estado: string | null;
	fecha_ingreso: string | null;
	diario_oficial: string | null;
	autores: string;
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
	porTema: Record<string, number>;
}

export interface CifraOrigen extends Conteo {
	iniciativa: string;
	medianaDias: number | null;
}

export interface CifraAutor extends Conteo {
	nombre: string;
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

export function panorama(db: Base): Panorama {
	const filas = db
		.prepare(
			`SELECT p.titulo, p.anno, p.iniciativa, p.camara_origen, p.estado, p.fecha_ingreso,
			        p.diario_oficial, p.autores
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
		return { nombre, desde, hasta, total: indices.length, porTema };
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
		tiempoPorPeriodo
	};
}
