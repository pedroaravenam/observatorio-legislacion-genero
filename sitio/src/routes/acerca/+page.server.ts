import { baseDatos } from '#lib/server/db';
import { conteoSenales } from '#lib/server/consultas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { senales: await conteoSenales(baseDatos()) };
};
