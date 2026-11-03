// Los mismos datos que el CSV, en JSON, para quien quiera consultarlos desde un programa.
import { json } from '@sveltejs/kit';
import { baseDatos } from '#lib/server/db';
import { exportar, leerFiltros, publicacion } from '#lib/server/consultas';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const db = baseDatos();
	const filtros = leerFiltros(url);
	const [proyectos, pub] = await Promise.all([exportar(db, filtros), publicacion(db)]);
	return json(
		{
			generado: pub.senado_consultado ?? null,
			fuente:
				'Servicio de tramitación del Senado de Chile, con los textos de ley de la Biblioteca del Congreso Nacional',
			filtros: {
				q: filtros.texto || null,
				anno: filtros.anno,
				estado: filtros.estado,
				iniciativa: filtros.iniciativa,
				tema: filtros.tema,
				camara: filtros.camara,
				autor: filtros.autor,
				orden: filtros.orden,
				alcance: filtros.soloGenero ? 'genero' : 'todos'
			},
			total: proyectos.length,
			proyectos: proyectos.map((p) => ({ ...p, ficha: `${url.origin}/boletin/${p.boletin}` }))
		},
		{ headers: { 'cache-control': 'public, max-age=300' } }
	);
};
