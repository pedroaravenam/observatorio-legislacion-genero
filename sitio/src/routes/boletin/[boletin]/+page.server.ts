import { error } from '@sveltejs/kit';
import { esBoletin } from '#lib/formato';
import { baseDatos } from '#lib/server/db';
import { ficha } from '#lib/server/consultas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	if (!esBoletin(params.boletin))
		error(
			404,
			'Ese número de boletín no tiene un formato válido. Los boletines se escriben con guion, como 11077-07.'
		);
	const proyecto = await ficha(baseDatos(), params.boletin);
	if (!proyecto)
		error(
			404,
			`No encontramos el boletín ${params.boletin} entre los proyectos presentados desde 1990. Revisa el número o búscalo desde la portada.`
		);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { proyecto };
};
