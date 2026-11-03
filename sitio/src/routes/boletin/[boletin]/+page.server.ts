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
			`El boletín ${params.boletin} no está entre los proyectos de género del Observatorio: o el número no existe, o el proyecto no cumple nuestro criterio de selección. Puedes revisar el número o buscar desde la portada, y consultar el criterio en «Cómo funciona».`
		);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return { proyecto };
};
