// Lo último que se movió en la selección: ingresos, trámites y leyes publicadas.
import type { Base } from '#lib/server/db';

export interface Movimiento {
	boletin: string;
	titulo: string;
	fecha: string;
	estado: string | null;
	/** Descripción del último trámite, tal como la registra el Senado; null si no hay. */
	tramite: string | null;
	camara: string | null;
}

export interface Ingreso {
	boletin: string;
	titulo: string;
	fecha: string;
	iniciativa: string | null;
	camara_origen: string | null;
}

export interface LeyReciente {
	boletin: string;
	titulo: string;
	fecha: string;
	ley: string | null;
}

export interface Actualidad {
	ingresos: Ingreso[];
	movimientos: Movimiento[];
	leyes: LeyReciente[];
	/** Proyectos de la selección que ingresaron en los últimos 30 días contados desde `hoy`. */
	ingresosMes: number;
	/** Proyectos con algún trámite en los últimos 30 días. */
	movidosMes: number;
}

type Tramite = [string | null, string | null, string, string | null, string | null];

const SELECCION = 'FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin';

function menosDias(hoy: string, n: number): string {
	const d = new Date(`${hoy}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

export function actualidad(
	db: Base,
	hoy: string = new Date().toISOString().slice(0, 10)
): Actualidad {
	const ingresos = db
		.prepare(
			`SELECT p.boletin, p.titulo, p.fecha_ingreso AS fecha, p.iniciativa, p.camara_origen
			 ${SELECCION} WHERE p.fecha_ingreso IS NOT NULL
			 ORDER BY p.fecha_ingreso DESC, p.numero DESC LIMIT 12`
		)
		.all()
		.map((f) => ({ ...f }) as unknown as Ingreso);

	const movimientos = (
		db
			.prepare(
				`SELECT p.boletin, p.titulo, p.ultimo_tramite AS fecha, p.estado, p.tramites
				 ${SELECCION} WHERE p.ultimo_tramite IS NOT NULL
				 ORDER BY p.ultimo_tramite DESC, p.numero DESC LIMIT 20`
			)
			.all() as unknown as (Omit<Movimiento, 'tramite' | 'camara'> & { tramites: string })[]
	).map((f) => {
		const ultimo = (JSON.parse(f.tramites) as Tramite[]).at(-1);
		return {
			boletin: f.boletin,
			titulo: f.titulo,
			fecha: f.fecha,
			estado: f.estado,
			tramite: ultimo?.[2]?.trim() || null,
			camara: ultimo?.[4] ?? null
		};
	});

	const leyes = db
		.prepare(
			`SELECT p.boletin, p.titulo, p.diario_oficial AS fecha, p.ley_numero AS ley
			 ${SELECCION} WHERE p.estado = 'Publicado' AND p.diario_oficial IS NOT NULL
			 ORDER BY p.diario_oficial DESC, p.numero DESC LIMIT 8`
		)
		.all()
		.map((f) => ({ ...f }) as unknown as LeyReciente);

	const desde = menosDias(hoy, 30);
	const contar = (columna: 'fecha_ingreso' | 'ultimo_tramite') =>
		(
			db.prepare(`SELECT count(*) AS n ${SELECCION} WHERE p.${columna} >= ?`).get(desde) as {
				n: number;
			}
		).n;

	return {
		ingresos,
		movimientos,
		leyes,
		ingresosMes: contar('fecha_ingreso'),
		movidosMes: contar('ultimo_tramite')
	};
}
