// Estado mínimo del sitio: cuándo se consultó el Senado por última vez y cuántos proyectos hay.
// Lo usa la comprobación diaria de datos al día (despliegue/alertar.sh) y cualquiera que quiera verificarlo.
import { json } from '@sveltejs/kit';
import { baseDatos } from '#lib/server/db';
import { publicacion } from '#lib/server/consultas';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = baseDatos();
	const pub = await publicacion(db);
	const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
	return json(
		{
			consultado: pub.senado_consultado ?? null,
			proyectos: n('SELECT count(*) AS n FROM proyecto'),
			seleccion: n('SELECT count(*) AS n FROM seleccion_genero')
		},
		{ headers: { 'cache-control': 'public, max-age=60' } }
	);
};
