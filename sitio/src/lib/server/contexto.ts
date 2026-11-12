// Datos de la portada: hitos legislativos y el tamaño de la selección frente a todo lo que tramita el Congreso.
import type { Base } from '#lib/server/db';

export interface Hito {
	boletin: string;
	nombre: string;
	ley: string;
	/** Fecha de publicación en el Diario Oficial, AAAA-MM-DD. */
	publicada: string;
	anno: number;
}

/**
 * Leyes de la selección que sirven de referencia para leer el período. Es una elección editorial del Observatorio:
 * el nombre es el de uso común y el número y la fecha salen de la base. Un boletín que deje de estar publicado
 * o salga de la selección simplemente no se muestra.
 */
const HITOS: [boletin: string, nombre: string][] = [
	['47-06', 'Se crea el Servicio Nacional de la Mujer'],
	['451-07', 'Primera ley de violencia intrafamiliar'],
	['1060-07', 'Nueva ley de filiación'],
	['2318-18', 'Segunda ley de violencia intrafamiliar, con procedimientos y sanciones'],
	['4356-13', 'Igualdad de remuneraciones entre hombres y mujeres'],
	['4937-18', 'El femicidio entra al Código Penal'],
	['7526-13', 'Se extiende el descanso de maternidad'],
	['7873-07', 'Acuerdo de Unión Civil'],
	['9326-07', 'Fin del sistema binominal'],
	['9895-11', 'Interrupción del embarazo en tres causales'],
	['8924-07', 'Identidad de género'],
	['9936-07', 'Acoso sexual callejero'],
	['11970-34', 'Se amplía el delito de femicidio'],
	['11750-04', 'Acoso sexual en el ámbito académico'],
	['11422-07', 'Matrimonio entre personas del mismo sexo'],
	['11077-07', 'Ley integral contra la violencia hacia las mujeres']
];

export function hitos(db: Base): Hito[] {
	const consulta = db.prepare(
		`SELECT p.ley_numero AS ley, p.diario_oficial AS publicada
		 FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin
		 WHERE p.boletin = ? AND p.estado = 'Publicado' AND p.ley_numero IS NOT NULL
		       AND p.diario_oficial IS NOT NULL`
	);
	const lista: Hito[] = [];
	for (const [boletin, nombre] of HITOS) {
		const f = consulta.get(boletin) as { ley: string; publicada: string } | undefined;
		if (!f) continue;
		lista.push({
			boletin,
			nombre,
			// El Senado escribe «Ley Nº» y «Ley N°»; se unifica.
			ley: f.ley.replace(/N[º°]\s*/, 'N.º '),
			publicada: f.publicada.slice(0, 10),
			anno: Number(f.publicada.slice(0, 4))
		});
	}
	return lista.sort((a, b) => a.publicada.localeCompare(b.publicada));
}

/** Boletines que el Observatorio tiene cargados del Senado, sean o no de género. */
export function totalBoletines(db: Base): number {
	return (db.prepare('SELECT count(*) AS n FROM proyecto').get() as { n: number }).n;
}
