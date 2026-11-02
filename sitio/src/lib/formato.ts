// Funciones puras de presentación y enlaces a fuentes oficiales. No dependen de la base.

const MESES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre'
];

/** Fecha AAAA-MM-DD a «21 de abril de 2015». Devuelve null si no es una fecha válida. */
export function fechaLarga(iso: string | null | undefined): string | null {
	const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return null;
	const mes = MESES[Number(m[2]) - 1];
	return mes ? `${Number(m[3])} de ${mes} de ${m[1]}` : null;
}

/** Fecha AAAA-MM-DD a «21-04-2015». */
export function fechaCorta(iso: string | null | undefined): string | null {
	const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Instante ISO 8601 a fecha y hora de Chile continental. */
export function fechaHoraChile(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return null;
	return new Intl.DateTimeFormat('es-CL', {
		dateStyle: 'long',
		timeStyle: 'short',
		timeZone: 'America/Santiago'
	}).format(d);
}

/** Ficha de tramitación del Senado, que incluye ambas cámaras. */
export function urlFichaSenado(boletin: string): string {
	return `https://tramitacion.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${encodeURIComponent(boletin)}`;
}

/** Número de ley a partir del texto del Senado («Ley N° 20.870» → 20870). Los decretos no tienen número de ley. */
export function numeroLey(texto: string | null | undefined): number | null {
	const m = texto?.match(/^Ley\s+N[°º]?\s*([\d.]+)/i);
	if (!m) return null;
	const n = Number(m[1].replace(/\./g, ''));
	return Number.isInteger(n) && n > 0 ? n : null;
}

/** Texto de la ley en la BCN (LeyChile). */
export function urlLeyBcn(numero: number): string {
	return `https://www.bcn.cl/leychile/navegar?idLey=${numero}`;
}

/** Boletín válido: número y código de comisión separados por guion (por ejemplo, 11077-07). */
export function esBoletin(texto: string): boolean {
	return /^\d{1,6}-\d{2}$/.test(texto);
}

/**
 * Convierte lo que escribe la persona en una consulta FTS5 segura:
 * cada palabra se busca como prefijo y todas deben aparecer.
 * Devuelve null si no queda ninguna palabra útil.
 */
export function consultaBusqueda(texto: string): string | null {
	const palabras = texto
		.normalize('NFC')
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/u)
		.filter((p) => p.length >= 2)
		.slice(0, 8);
	if (palabras.length === 0) return null;
	return palabras.map((p) => `"${p}"*`).join(' ');
}

/** Etiqueta legible del nivel de señal de la selección preliminar. */
export function etiquetaSenal(nivel: string): string {
	const etiquetas: Record<string, string> = {
		T1_titulo_estricto: 'El título menciona el tema de forma directa',
		T2_titulo_medio: 'El título menciona términos relacionados',
		T3_cuerpo_firme: 'El texto del proyecto trata el tema de forma reiterada',
		T4_cuerpo_amplio: 'El texto del proyecto menciona el tema',
		T5_materias: 'Las materias asignadas por el Senado se relacionan con el tema',
		L_texto_ley_fuera: 'El texto de la ley resultante trata el tema',
		V2_conteo_absoluto: 'El texto menciona el tema muchas veces',
		V_validado_densidad_baja: 'Revisado: trata el tema pese a pocas menciones'
	};
	return etiquetas[nivel] ?? 'Señal automática';
}

export const PASOS_TRAMITACION = [
	'Primer trámite',
	'Segundo trámite',
	'Tercer trámite o comisión mixta',
	'Aprobación presidencial',
	'Ley publicada'
] as const;

/**
 * Paso del proceso legislativo (índice en PASOS_TRAMITACION) según el estado y la etapa del Senado.
 * Devuelve null cuando el proyecto no avanza (archivado, retirado, rechazado) o la etapa no se reconoce.
 */
export function pasoTramitacion(estado: string | null, etapa: string | null): number | null {
	if (estado === 'Publicado') return 4;
	if (estado !== 'En tramitación' || !etapa) return null;
	if (/^Primer trámite/i.test(etapa)) return 0;
	if (/^Segundo trámite/i.test(etapa)) return 1;
	if (/Tercer trámite|Mixta|insistencia|finalización/i.test(etapa)) return 2;
	if (/aprobaci[oó]n presidencial|veto|Congreso Pleno|Tribunal/i.test(etapa)) return 3;
	return null;
}

/** Clase visual del estado: publicado, en tramitación o cerrado. */
export function claseEstado(estado: string | null): string {
	if (estado === 'Publicado') return 'publicado';
	if (estado === 'En tramitación') return 'tramitacion';
	return 'cerrado';
}
