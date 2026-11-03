// Consultas a la base pública SQLite. Todos los valores van como parámetros enlazados; nunca se concatenan en el SQL.
import {
	CAMARAS,
	consultaBusqueda,
	esBoletin,
	ORDENES,
	ordenPorDefecto,
	type Orden
} from '#lib/formato';
import { TEMAS, temasDe } from '#lib/temas';
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
	camara: string | null;
	autor: string | null;
	orden: Orden;
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
	const camara = p.get('camara');
	const orden = p.get('orden');
	const texto = (p.get('q') ?? '').trim().slice(0, 200);
	return {
		texto,
		anno: Number.isInteger(anno) && anno >= 1990 && anno <= 2100 ? anno : null,
		estado: estado && (ESTADOS as readonly string[]).includes(estado) ? estado : null,
		iniciativa:
			iniciativa && (INICIATIVAS as readonly string[]).includes(iniciativa) ? iniciativa : null,
		tema: tema && TEMAS.some((t) => t.clave === tema) ? tema : null,
		camara: camara && (CAMARAS as readonly string[]).includes(camara) ? camara : null,
		autor: (p.get('autor') ?? '').trim().slice(0, 120) || null,
		orden:
			orden && (ORDENES as readonly string[]).includes(orden)
				? (orden as Orden)
				: ordenPorDefecto(texto),
		pagina: Number.isInteger(pagina) && pagina >= 1 && pagina <= 1000 ? pagina : 1
	};
}

const ORDEN_SQL: Record<Exclude<Orden, 'pertinencia'>, string> = {
	recientes: 'p.fecha_ingreso DESC, p.numero DESC',
	antiguos: 'p.fecha_ingreso ASC, p.numero ASC',
	movimiento: 'p.ultimo_tramite IS NULL, p.ultimo_tramite DESC, p.numero DESC'
};

/** Condiciones, valores y orden de una búsqueda. La usan la lista y la descarga, para que coincidan siempre. */
function construirConsulta(f: Filtros) {
	const condiciones: string[] = [];
	const valores: (string | number)[] = [];
	let desde = 'proyecto p';
	let pertinencia = false;

	const texto = f.texto.replace(/\s+/g, '');
	if (esBoletin(texto)) {
		condiciones.push('p.boletin = ?');
		valores.push(texto);
	} else if (/^\d{1,6}$/.test(texto)) {
		condiciones.push('p.numero = ?');
		valores.push(Number(texto));
	} else {
		const consulta = consultaBusqueda(f.texto);
		if (consulta) {
			desde = 'proyecto_busqueda b JOIN proyecto p ON p.rowid = b.rowid';
			condiciones.push('proyecto_busqueda MATCH ?');
			valores.push(consulta);
			pertinencia = true;
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
	if (f.camara) {
		condiciones.push('p.camara_origen = ?');
		valores.push(f.camara);
	}
	if (f.autor) {
		condiciones.push('EXISTS (SELECT 1 FROM json_each(p.autores) WHERE value = ?)');
		valores.push(f.autor);
	}
	if (f.tema) {
		condiciones.push('tiene_tema(p.titulo, ?) = 1');
		valores.push(f.tema);
	}

	// La pertinencia solo existe cuando hay palabras que buscar; si no, se ordena por fecha.
	const orden =
		f.orden === 'pertinencia'
			? pertinencia
				? 'b.rank, p.fecha_ingreso DESC'
				: ORDEN_SQL.recientes
			: ORDEN_SQL[f.orden];
	const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
	return {
		valores,
		orden,
		base: `FROM ${desde} JOIN seleccion_genero g ON g.boletin = p.boletin ${donde}`
	};
}

export async function listar(db: Base, f: Filtros) {
	const { valores, orden, base } = construirConsulta(f);
	const desplazamiento = (f.pagina - 1) * POR_PAGINA;

	const total = db.prepare(`SELECT count(*) AS n ${base}`).get(...valores) as { n: number };
	const filas = db
		.prepare(
			`SELECT p.boletin, p.titulo, p.fecha_ingreso, p.iniciativa, p.camara_origen, p.estado, p.etapa,
			        p.ley_numero, p.ultimo_tramite
			 ${base} ORDER BY ${orden} LIMIT ? OFFSET ?`
		)
		.all(...valores, POR_PAGINA, desplazamiento);
	return {
		total: total.n,
		// node:sqlite entrega objetos sin prototipo; se copian para serializarlos sin sorpresas.
		filas: filas.map((f) => ({ ...f }) as unknown as FilaLista)
	};
}

export interface FilaExportada {
	boletin: string;
	titulo: string;
	fecha_ingreso: string | null;
	iniciativa: string | null;
	camara_origen: string | null;
	estado: string | null;
	etapa: string | null;
	ley_numero: string | null;
	diario_oficial: string | null;
	ultimo_tramite: string | null;
	autores: string[];
	temas: string[];
}

/** Todos los proyectos que cumplen los filtros, sin paginar, con los datos que se descargan. */
export async function exportar(db: Base, f: Filtros): Promise<FilaExportada[]> {
	const { valores, orden, base } = construirConsulta(f);
	const filas = db
		.prepare(
			`SELECT p.boletin, p.titulo, p.fecha_ingreso, p.iniciativa, p.camara_origen, p.estado, p.etapa,
			        p.ley_numero, p.diario_oficial, p.ultimo_tramite, p.autores,
			        g.boletin IS NOT NULL AS genero
			 ${base} ORDER BY ${orden}`
		)
		.all(...valores) as unknown as (Omit<FilaExportada, 'autores' | 'temas'> & {
		autores: string;
	})[];
	return filas.map((r) => ({
		boletin: r.boletin,
		titulo: r.titulo,
		fecha_ingreso: r.fecha_ingreso,
		iniciativa: r.iniciativa,
		camara_origen: r.camara_origen,
		estado: r.estado,
		etapa: r.etapa,
		ley_numero: r.ley_numero,
		diario_oficial: r.diario_oficial,
		ultimo_tramite: r.ultimo_tramite,
		autores: JSON.parse(r.autores) as string[],
		temas: temasDe(r.titulo)
	}));
}

/** Nombres de autores de los proyectos de la selección, sin repetir y en orden alfabético del español. */
export async function listaAutores(db: Base): Promise<string[]> {
	const r = db
		.prepare('SELECT DISTINCT j.value AS nombre FROM proyecto p, json_each(p.autores) j')
		.all() as { nombre: string }[];
	return r.map((x) => x.nombre).sort((a, b) => a.localeCompare(b, 'es'));
}

export async function ficha(db: Base, boletin: string): Promise<Ficha | null> {
	const fila = db
		.prepare(
			`SELECT p.*, g.nivel_senal, g.version AS version_seleccion
			 FROM proyecto p JOIN seleccion_genero g ON g.boletin = p.boletin
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
