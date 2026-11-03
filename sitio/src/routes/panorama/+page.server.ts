import { baseDatos } from '#lib/server/db';
import { panorama } from '#lib/server/panorama';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { panorama: panorama(baseDatos()) };
};
