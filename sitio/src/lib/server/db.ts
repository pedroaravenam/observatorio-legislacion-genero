import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

/** Devuelve la base D1 o responde 503 si el sitio corre sin ella. */
export function baseDatos(): D1Database {
	const db = (env as Partial<Env>).DB;
	if (!db) error(503, 'La base de datos del Observatorio no está disponible en este momento.');
	return db;
}
