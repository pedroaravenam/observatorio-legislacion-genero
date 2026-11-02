import { baseDatos } from '#lib/server/db';
import {
	annos,
	ESTADOS,
	INICIATIVAS,
	leerFiltros,
	listar,
	POR_PAGINA,
	resumenGenero
} from '#lib/server/consultas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const db = baseDatos();
	const filtros = leerFiltros(url);
	const [resultado, listaAnnos, resumen] = await Promise.all([
		listar(db, filtros),
		annos(db),
		resumenGenero(db)
	]);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return {
		filtros,
		...resultado,
		paginas: Math.max(1, Math.ceil(resultado.total / POR_PAGINA)),
		resumen,
		opciones: { annos: listaAnnos, estados: ESTADOS, iniciativas: INICIATIVAS }
	};
};
