// Descarga en CSV de los proyectos que cumplen los mismos filtros de la portada.
import { aCsv } from '#lib/formato';
import { baseDatos } from '#lib/server/db';
import { exportar, leerFiltros } from '#lib/server/consultas';
import type { RequestHandler } from './$types';

const COLUMNAS = [
	'boletin',
	'titulo',
	'fecha_ingreso',
	'iniciativa',
	'camara_origen',
	'estado',
	'etapa',
	'ley_numero',
	'diario_oficial',
	'ultimo_tramite',
	'autores',
	'temas',
	'seleccion_genero',
	'ficha'
] as const;

export const GET: RequestHandler = async ({ url }) => {
	const filas = await exportar(baseDatos(), leerFiltros(url));
	const cuerpo = aCsv(
		filas.map((f) => ({
			...f,
			autores: f.autores.join('; '),
			temas: f.temas.join('; '),
			seleccion_genero: f.seleccion_genero ? 'si' : 'no',
			ficha: `${url.origin}/boletin/${f.boletin}`
		})),
		[...COLUMNAS]
	);
	const dia = new Date().toISOString().slice(0, 10);
	return new Response(cuerpo, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="proyectos-genero-${dia}.csv"`,
			'cache-control': 'public, max-age=300'
		}
	});
};
