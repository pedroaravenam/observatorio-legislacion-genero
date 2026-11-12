import { baseDatos } from '#lib/server/db';
import { resumenGenero } from '#lib/server/consultas';
import { panorama } from '#lib/server/panorama';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const db = baseDatos();
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { panorama: panorama(db), resumen: await resumenGenero(db) };
};
