import { redirect } from '@sveltejs/kit';
import { baseDatos } from '#lib/server/db';
import { resumenGenero } from '#lib/server/consultas';
import { hitos, totalBoletines } from '#lib/server/contexto';
import { panorama } from '#lib/server/panorama';
import type { PageServerLoad } from './$types';

/** Parámetros del buscador, que antes vivía en la portada: los enlaces antiguos siguen funcionando. */
const DEL_BUSCADOR = [
	'q',
	'anno',
	'estado',
	'iniciativa',
	'tema',
	'camara',
	'autor',
	'autoria',
	'orden',
	'pagina'
];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	if (DEL_BUSCADOR.some((p) => url.searchParams.has(p))) {
		redirect(308, `/proyectos${url.search}`);
	}
	const db = baseDatos();
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return {
		panorama: panorama(db),
		resumen: await resumenGenero(db),
		hitos: hitos(db),
		totalBoletines: totalBoletines(db)
	};
};
