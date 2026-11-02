import { error } from '@sveltejs/kit';
import { DatabaseSync } from 'node:sqlite';

export type Base = DatabaseSync;

let base: DatabaseSync | null = null;

/**
 * Abre la base pública SQLite en modo de solo lectura (una conexión por proceso).
 * El exportador la reescribe en una transacción; con WAL, el sitio sigue leyendo la versión anterior
 * hasta que la transacción termina. Si el archivo no existe, responde 503.
 */
export function baseDatos(): DatabaseSync {
	if (base) return base;
	const ruta = process.env.OBSERVATORIO_DB || 'observatorio.db';
	try {
		const db = new DatabaseSync(ruta, { readOnly: true });
		db.exec('PRAGMA busy_timeout = 5000');
		base = db;
		return db;
	} catch {
		error(503, 'La base de datos del Observatorio no está disponible en este momento.');
	}
}
