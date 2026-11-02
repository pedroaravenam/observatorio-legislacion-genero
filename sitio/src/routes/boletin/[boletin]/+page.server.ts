import { error } from '@sveltejs/kit';
import { esBoletin } from '#lib/formato';
import { baseDatos } from '#lib/server/db';
import { ficha } from '#lib/server/consultas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	if (!esBoletin(params.boletin)) error(404, 'El número de boletín no tiene un formato válido.');
	const proyecto = await ficha(baseDatos(), params.boletin);
	if (!proyecto) error(404, `No encontramos el boletín ${params.boletin}.`);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { proyecto };
};
