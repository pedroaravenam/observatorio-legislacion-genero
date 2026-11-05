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

/** Razón legible por la que un proyecto entró a la selección de género. */
export function etiquetaSenal(nivel: string): string {
	const etiquetas: Record<string, string> = {
		T1_titulo_estricto: 'Entró por su título, que nombra un tema de género de forma directa',
		T2_titulo_medio: 'Entró por su título, que contiene un término relacionado con el género',
		T3_cuerpo_firme: 'Entró por el texto del proyecto, que trata temas de género con frecuencia',
		T4_cuerpo_amplio: 'Entró por el texto del proyecto, que se refiere al género en varias partes',
		T5_materias: 'Entró por las materias que le asignó el Senado',
		L_texto_ley_fuera: 'Entró por el texto de la ley que resultó del proyecto',
		V2_conteo_absoluto: 'Entró tras leer su texto completo, que trata el tema en varias partes',
		V_validado_densidad_baja: 'Entró tras leer su texto, que trata el tema aunque lo menciona poco',
		A1_agente_tema_central:
			'Lo leyó un agente que aplica nuestro criterio y concluyó que el género es el tema central',
		A2_agente_componente:
			'Lo leyó un agente que aplica nuestro criterio y concluyó que una parte del proyecto trata de género',
		A3_agente_debil:
			'Lo leyó un agente que aplica nuestro criterio y, ante una duda razonable, lo incluyó con relación débil',
		M_decision_manual:
			'El equipo del Observatorio lo incluyó por decisión expresa, con relación débil'
	};
	return etiquetas[nivel] ?? 'Cumple una de las reglas del criterio de selección';
}

/** Niveles de relación con el género. La clave es la de los datos descargables; el nombre, el del sitio. */
export const NIVELES_RELACION: Record<
	string,
	{ clave: string; nombre: string; explicacion: string }
> = {
	tema_central: {
		clave: 'alta',
		nombre: 'alta',
		explicacion: 'El género es el tema central del proyecto.'
	},
	componente: {
		clave: 'media',
		nombre: 'media',
		explicacion: 'Una parte del proyecto trata de género.'
	},
	debil: {
		clave: 'debil',
		nombre: 'débil',
		explicacion:
			'La relación es lateral o dudosa: entra porque, ante una duda razonable, el Observatorio incluye.'
	}
};

/** Nivel de relación con el género de un proyecto, o null si aún no se le asignó (los de la lista original). */
export function nivelRelacion(grupo: string | null | undefined) {
	return grupo ? (NIVELES_RELACION[grupo] ?? null) : null;
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

export const ORDENES = ['pertinencia', 'recientes', 'antiguos', 'movimiento'] as const;
export type Orden = (typeof ORDENES)[number];

export const CAMARAS = ['Cámara de Diputados', 'Senado'] as const;

/**
 * Autoría de una moción según el sexo de quienes la firman. «mixta» es al menos una mujer y al menos un hombre.
 * Los mensajes (Presidencia) y las mociones sin sexo conocido de sus autores no se pueden filtrar así.
 */
export const AUTORIAS = [
	{ clave: 'mujeres', nombre: 'Solo mujeres' },
	{ clave: 'hombres', nombre: 'Solo hombres' },
	{ clave: 'mixta', nombre: 'Mujeres y hombres' }
] as const;

/** Texto de la autoría de un proyecto para mostrar en su ficha. */
export function textoAutoria(autoria: string | null | undefined): string | null {
	switch (autoria) {
		case 'mujeres':
			return 'firmado solo por mujeres';
		case 'hombres':
			return 'firmado solo por hombres';
		case 'mixta':
			return 'firmado por mujeres y hombres';
		case 'ejecutivo':
			return 'presentado por la Presidencia de la República';
		default:
			return null;
	}
}

/** Orden que se aplica cuando la persona no elige uno: por pertinencia si buscó palabras, si no por fecha. */
export function ordenPorDefecto(texto: string): Orden {
	return texto.trim() ? 'pertinencia' : 'recientes';
}

/** Lo mínimo de los filtros que viaja en la URL. */
export interface FiltrosUrl {
	texto: string;
	anno: number | null;
	estado: string | null;
	iniciativa: string | null;
	tema: string | null;
	camara: string | null;
	autor: string | null;
	autoria: string | null;
	orden: Orden;
	pagina: number;
}

/** Parámetros de URL de unos filtros; omite los que tienen su valor por defecto. */
export function parametrosFiltros(
	f: FiltrosUrl,
	cambios: { pagina?: number } = {}
): URLSearchParams {
	const p = new URLSearchParams();
	if (f.texto) p.set('q', f.texto);
	if (f.anno) p.set('anno', String(f.anno));
	if (f.estado) p.set('estado', f.estado);
	if (f.iniciativa) p.set('iniciativa', f.iniciativa);
	if (f.tema) p.set('tema', f.tema);
	if (f.camara) p.set('camara', f.camara);
	if (f.autor) p.set('autor', f.autor);
	if (f.autoria) p.set('autoria', f.autoria);
	if (f.orden !== ordenPorDefecto(f.texto)) p.set('orden', f.orden);
	const pagina = cambios.pagina ?? f.pagina;
	if (pagina > 1) p.set('pagina', String(pagina));
	return p;
}

/** Una celda de CSV según RFC 4180: se entrecomilla si trae coma, comillas o saltos de línea. */
export function celdaCsv(valor: string | number | null | undefined): string {
	const t = valor === null || valor === undefined ? '' : String(valor);
	return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Tabla CSV con BOM para que Excel reconozca UTF-8 y terminadores CRLF. */
export function aCsv<T extends Record<string, string | number | null | undefined>>(
	filas: T[],
	columnas: (keyof T & string)[]
): string {
	const lineas = [columnas.map(celdaCsv).join(',')];
	for (const fila of filas) lineas.push(columnas.map((c) => celdaCsv(fila[c])).join(','));
	return '﻿' + lineas.join('\r\n') + '\r\n';
}
