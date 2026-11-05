import { baseDatos } from '#lib/server/db';
import {
	annos,
	ESTADOS,
	INICIATIVAS,
	leerFiltros,
	listaAutores,
	listar,
	POR_PAGINA,
	resumenGenero
} from '#lib/server/consultas';
import { AUTORIAS, CAMARAS } from '#lib/formato';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	const db = baseDatos();
	const filtros = leerFiltros(url);
	const [resultado, listaAnnos, resumen, autores] = await Promise.all([
		listar(db, filtros),
		annos(db),
		resumenGenero(db),
		listaAutores(db)
	]);
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return {
		filtros,
		...resultado,
		paginas: Math.max(1, Math.ceil(resultado.total / POR_PAGINA)),
		resumen,
		// Un nombre que no está en la lista no filtra nada útil: se avisa junto al campo.
		autorDesconocido: filtros.autor !== null && !autores.includes(filtros.autor),
		opciones: {
			annos: listaAnnos,
			estados: ESTADOS,
			iniciativas: INICIATIVAS,
			camaras: CAMARAS,
			autorias: AUTORIAS,
			autores
		}
	};
};
