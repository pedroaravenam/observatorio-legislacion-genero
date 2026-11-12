import { baseDatos } from '#lib/server/db';
import { actualidad } from '#lib/server/actualidad';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { actualidad: actualidad(baseDatos()) };
};
