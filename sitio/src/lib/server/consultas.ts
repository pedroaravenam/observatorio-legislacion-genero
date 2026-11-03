// Consultas a la base pública SQLite. Todos los valores van como parámetros enlazados; nunca se concatenan en el SQL.
import { consultaBusqueda, esBoletin } from '#lib/formato';
import { TEMAS } from '#lib/temas';
import type { Base } from '#lib/server/db';

export const ESTADOS = [
	'En tramitación',
	'Publicado',
	'Archivado',
	'Retirado',
	'Rechazado',
	'Inconstitucional',
	'Inadmisible'
] as const;
export const INICIATIVAS = ['Mensaje', 'Moción'] as const;
export const POR_PAGINA = 25;

export interface Filtros {
	texto: string;
	anno: number | null;
	estado: string | null;
	iniciativa: string | null;
	tema: string | null;
	soloGenero: boolean;
	pagina: number;
}

export interface FilaLista {
	boletin: string;
	titulo: string;
	fecha_ingreso: string | null;
	iniciativa: string | null;
	camara_origen: string | null;
	estado: string | null;
	etapa: string | null;
	ley_numero: string | null;
	ultimo_tramite: string | null;
	genero: number;
}

export interface Ficha extends FilaLista {
	subetapa: string | null;
	urgencia: string | null;
	diario_oficial: string | null;
	url_documento: string | null;
	materias: string[];
	autores: string[];
	tramites: [string | null, string | null, string, string | null, string | null][];
	actualizado: string;
	fuente: string;
	nivel_senal: string | null;
	version_seleccion: string | null;
}

/** Lee y acota los filtros de la URL; los valores fuera de lista se ignoran. */
export function leerFiltros(url: URL): Filtros {
	const p = url.searchParams;
	const anno = Number(p.get('anno'));
	const pagina = Number(p.get('pagina'));
	const estado = p.get('estado');
	const iniciativa = p.get('iniciativa');
	const tema = p.get('tema');
	return {
		texto: (p.get('q') ?? '').trim().slice(0, 200),
		anno: Number.isInteger(anno) && anno >= 1990 && anno <= 2100 ? anno : null,
		estado: estado && (ESTADOS as readonly string[]).includes(estado) ? estado : null,
		iniciativa:
			iniciativa && (INICIATIVAS as readonly string[]).includes(iniciativa) ? iniciativa : null,
		tema: tema && TEMAS.some((t) => t.clave === tema) ? tema : null,
		// Por defecto se muestra la selección temática; «todos» la desactiva.
		soloGenero: p.get('alcance') !== 'todos',
		pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= 1000 ? pagina : 1
	};
}

export async function listar(db: Base, f: Filtros) {
	const condiciones: string[] = [];
	const valores: (string | number)[] = [];
	let desde = 'proyecto p';
	let orden = 'p.fecha_ingreso DESC, p.numero DESC';

	const texto = f.texto.replace(/\s+/g, '');
	// Una búsqueda por número de boletín muestra el proyecto aunque no esté en la selección temática.
	let porNumero = true;
	if (esBoletin(texto)) {
		condiciones.push('p.boletin = ?');
		valores.push(texto);
	} else if (/^\d{1,6}$/.test(texto)) {
		condiciones.push('p.numero = ?');
		valores.push(Number(texto));
	} else {
		porNumero = false;
		const consulta = consultaBusqueda(f.texto);
		if (consulta) {
			desde = 'proyecto_busqueda b JOIN proyecto p ON p.rowid = b.rowid';
			condiciones.push('proyecto_busqueda MATCH ?');
			valores.push(consulta);
			orden = 'b.rank, p.fecha_ingreso DESC';
		}
	}
	if (f.anno !== null) {
		condiciones.push('p.anno = ?');
		valores.push(f.anno);
	}
	if (f.estado) {
		condiciones.push('p.estado = ?');
		valores.push(f.estado);
	}
	if (f.iniciativa) {
		condiciones.push('p.iniciativa = ?');
		valores.push(f.iniciativa);
	}
	if (f.tema) {
		condiciones.push('tiene_tema(p.titulo, ?) = 1');
		valores.push(f.tema);
	}
	if (f.soloGenero && !porNumero) condiciones.push('g.boletin IS NOT NULL');

	const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
	const base = `FROM ${desde} LEFT JOIN seleccion_genero g ON g.boletin = p.boletin ${donde}`;
	const desplazamiento = (f.pagina - 1) * POR_PAGINA;

	const total = db.prepare(`SELECT count(*) AS n ${base}`).get(...valores) as { n: number };
	const filas = db
		.prepare(
			`SELECT p.boletin, p.titulo, p.fecha_ingreso, p.iniciativa, p.camara_origen, p.estado, p.etapa,
			        p.ley_numero, p.ultimo_tramite, g.boletin IS NOT NULL AS genero
			 ${base} ORDER BY ${orden} LIMIT ? OFFSET ?`
		)
		.all(...valores, POR_PAGINA, desplazamiento);
	return {
		porNumero,
		total: total.n,
		// node:sqlite entrega objetos sin prototipo; se copian para serializarlos sin sorpresas.
		filas: filas.map((f) => ({ ...f }) as unknown as FilaLista)
	};
}

export async function ficha(db: Base, boletin: string): Promise<Ficha | null> {
	const fila = db
		.prepare(
			`SELECT p.*, g.boletin IS NOT NULL AS genero, g.nivel_senal, g.version AS version_seleccion
			 FROM proyecto p LEFT JOIN seleccion_genero g ON g.boletin = p.boletin
			 WHERE p.boletin = ?`
		)
		.get(boletin) as Record<string, unknown> | undefined;
	if (!fila) return null;
	return {
		...({ ...fila } as unknown as Ficha),
		materias: JSON.parse(fila.materias as string),
		autores: JSON.parse(fila.autores as string),
		tramites: JSON.parse(fila.tramites as string)
	};
}

export async function annos(db: Base): Promise<number[]> {
	const r = db
		.prepare('SELECT DISTINCT anno FROM proyecto WHERE anno IS NOT NULL ORDER BY anno DESC')
		.all() as { anno: number }[];
	return r.map((x) => x.anno);
}

export async function publicacion(db: Base): Promise<Record<string, string>> {
	const r = db.prepare('SELECT clave, valor FROM publicacion').all() as {
		clave: string;
		valor: string;
	}[];
	return Object.fromEntries(r.map((x) => [x.clave, x.valor]));
}

export interface ResumenAnno {
	anno: number;
	total: number;
	leyes: number;
}

/** Proyectos de la selección de género por año de ingreso, y cuántos de ellos ya son ley publicada. */
export async function resumenGenero(db: Base): Promise<ResumenAnno[]> {
	const filas = db
		.prepare(
			`SELECT p.anno AS anno, count(*) AS total, sum(p.estado = 'Publicado') AS leyes
			 FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin
			 WHERE p.anno IS NOT NULL GROUP BY p.anno ORDER BY p.anno`
		)
		.all() as unknown as ResumenAnno[];
	return filas.map((f) => ({ anno: f.anno, total: f.total, leyes: f.leyes }));
}

/** Proyectos de la selección según la señal que los incluyó. */
export async function conteoSenales(db: Base): Promise<Record<string, number>> {
	const filas = db
		.prepare(
			`SELECT g.nivel_senal AS senal, count(*) AS n
			 FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin GROUP BY g.nivel_senal`
		)
		.all() as { senal: string; n: number }[];
	return Object.fromEntries(filas.map((f) => [f.senal, f.n]));
}
