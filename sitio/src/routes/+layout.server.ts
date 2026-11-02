import { baseDatos } from '#lib/server/db';
import { publicacion } from '#lib/server/consultas';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	try {
		const p = await publicacion(baseDatos());
		return { senadoConsultado: p.senado_consultado ?? null };
	} catch {
		// El pie de página no debe impedir que se muestre una página de error útil.
		return { senadoConsultado: null };
	}
};
