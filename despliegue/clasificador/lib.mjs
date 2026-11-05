// Funciones del clasificador sin efectos secundarios: léxico, evidencia, validación de la decisión y CSV.
// El léxico es el mismo que usa el sitio para asignar temas (sitio/src/lib/temas.ts), para que haya una sola fuente.
import { createHash } from 'node:crypto';
import { TEMAS } from '../../sitio/src/lib/temas.ts';

/** Minúsculas y sin tildes, conservando el largo del texto para poder cortar fragmentos del original. */
export function normalizarIgualLargo(texto) {
	let salida = '';
	for (const c of texto) salida += c.length === 1 ? (c.normalize('NFD')[0] ?? c) : c;
	return salida.toLowerCase();
}

const PATRONES = TEMAS.flatMap((t) => t.patrones).map((p) => new RegExp(p.source, 'g'));

/** Apariciones del léxico en un texto: conteo, densidad cada 10.000 caracteres y posiciones. */
export function contarLexico(texto) {
	const n = normalizarIgualLargo(texto);
	const posiciones = [];
	for (const re of PATRONES) {
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(n)) !== null) {
			if (m[0].length === 0) re.lastIndex++;
			else posiciones.push({ desde: m.index, hasta: m.index + m[0].length });
		}
	}
	posiciones.sort((a, b) => a.desde - b.desde);
	return {
		apariciones: posiciones.length,
		largo: texto.length,
		densidad: texto.length ? (posiciones.length / texto.length) * 10_000 : 0,
		posiciones
	};
}

/** Hasta `max` fragmentos del texto original, repartidos a lo largo del documento y sin solaparse. */
export function fragmentos(texto, posiciones, max = 12, radio = 220) {
	if (posiciones.length === 0) return [];
	const elegidas = [];
	const paso = Math.max(1, Math.floor(posiciones.length / max));
	for (let i = 0; i < posiciones.length && elegidas.length < max; i += paso) elegidas.push(posiciones[i]);
	const ventanas = [];
	for (const p of elegidas) {
		const desde = Math.max(0, p.desde - radio);
		const hasta = Math.min(texto.length, p.hasta + radio);
		const ultima = ventanas[ventanas.length - 1];
		if (ultima && desde <= ultima.hasta) ultima.hasta = Math.max(ultima.hasta, hasta);
		else ventanas.push({ desde, hasta });
	}
	return ventanas.map((v) => texto.slice(v.desde, v.hasta).replace(/\s+/g, ' ').trim());
}

const miles = new Intl.NumberFormat('es-CL');

/** Texto que ve el agente: título, metadatos y, si hay, el análisis del texto del proyecto. */
export function construirEvidencia(p, analisis) {
	const l = [
		`Boletín: ${p.boletin}`,
		`Título: ${p.titulo}`,
		`Iniciativa: ${p.iniciativa || 'sin dato'}; cámara de origen: ${p.camara || 'sin dato'}; ingreso: ${p.fecha_ingreso}`,
		`Materias asignadas por el Senado: ${p.materias || '(ninguna)'}`
	];
	if (!analisis) {
		l.push('Texto del proyecto: NO DISPONIBLE. Decide con el título y baja la confianza.');
	} else {
		l.push(
			`Texto del proyecto: ${miles.format(analisis.largo)} caracteres. Términos del léxico de género: ${analisis.apariciones} apariciones, ${analisis.densidad.toFixed(1)} por cada 10.000 caracteres.`
		);
		l.push(`Inicio del texto: «${analisis.inicio}»`);
		if (analisis.fragmentos.length) {
			l.push(`Fragmentos donde aparecen términos del léxico (${analisis.fragmentos.length}):`);
			analisis.fragmentos.forEach((f, i) => l.push(`${i + 1}. «${f}»`));
		} else l.push('Ningún término del léxico de género aparece en el texto.');
	}
	return l.join('\n');
}

/** Valida y normaliza la respuesta del agente; lanza si no cumple el esquema. */
export function validarDecision(o) {
	const grupos = ['tema_central', 'componente', 'debil', 'fuera'];
	const confianzas = ['alta', 'media', 'baja'];
	if (!o || typeof o !== 'object') throw new Error('La respuesta no es un objeto');
	if (!grupos.includes(o.grupo)) throw new Error(`grupo inválido: ${o.grupo}`);
	if (!['incluye', 'excluye'].includes(o.decision)) throw new Error(`decision inválida: ${o.decision}`);
	if ((o.grupo === 'fuera') !== (o.decision === 'excluye')) throw new Error('decision y grupo no coinciden');
	if (!confianzas.includes(o.confianza)) throw new Error(`confianza inválida: ${o.confianza}`);
	const motivo = String(o.motivo ?? '').replace(/\s+/g, ' ').replace(/--+/g, '–').trim().slice(0, 600);
	if (motivo.length < 10) throw new Error('El motivo es demasiado corto');
	return { incluye: o.decision === 'incluye', grupo: o.grupo, confianza: o.confianza, motivo };
}

/** ¿El mensaje de error del CLI indica que se agotó el límite de uso de la cuenta? */
export function esLimiteDeUso(mensaje) {
	return /hit your limit|usage limit|rate.?limit|quota|\b429\b|overloaded|too many requests/i.test(String(mensaje));
}

/** Texto plano de un RTF (la codificación ANSI de los documentos del Senado es windows-1252). */
export function textoRtf(rtf) {
	const ignorar = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'footnote', 'themedata', 'datastore', 'latentstyles', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'fldinst']);
	const cp1252 = new TextDecoder('windows-1252');
	let salida = '';
	const pila = [];
	let omitir = 0;
	let saltar = 1;
	for (let i = 0; i < rtf.length; ) {
		const c = rtf[i];
		if (c === '{') {
			i++;
			// Solo el grupo que inicia la omisión la termina al cerrarse; los anidados no tocan el estado.
			let inicia = false;
			if (omitir === 0) {
				if (rtf[i] === '\\' && rtf[i + 1] === '*') inicia = true;
				else if (rtf[i] === '\\') {
					const m = /^\\([a-z]+)/i.exec(rtf.slice(i, i + 24));
					inicia = Boolean(m && ignorar.has(m[1]));
				}
			}
			if (inicia) omitir = 1;
			pila.push(inicia);
		} else if (c === '}') {
			if (pila.pop()) omitir = 0;
			i++;
		} else if (c === '\\') {
			const sig = rtf[i + 1];
			if (sig === "'") {
				const byte = parseInt(rtf.slice(i + 2, i + 4), 16);
				if (!omitir && !Number.isNaN(byte)) salida += cp1252.decode(Uint8Array.of(byte));
				i += 4;
			} else if (/[a-z]/i.test(sig ?? '')) {
				const m = /^\\([a-z]+)(-?\d+)? ?/i.exec(rtf.slice(i, i + 40));
				const [todo, palabra, n] = m;
				if (!omitir) {
					if (palabra === 'par' || palabra === 'line') salida += '\n';
					else if (palabra === 'tab') salida += '\t';
					else if (palabra === 'u' && n !== undefined) {
						const v = Number(n);
						salida += String.fromCodePoint(v < 0 ? v + 65536 : v);
						saltar = 1;
						i += todo.length;
						if (rtf[i] === '\\' && rtf[i + 1] === "'") i += 4;
						else i += saltar;
						continue;
					}
				}
				i += todo.length;
			} else {
				if (!omitir && (sig === '\\' || sig === '{' || sig === '}')) salida += sig;
				i += 2;
			}
		} else {
			if (!omitir && c !== '\r' && c !== '\n') salida += c;
			i++;
		}
	}
	return salida;
}

/** Señal registrada para una decisión del agente. */
export function nivelSenal(d) {
	if (!d.incluye) return null;
	if (d.grupo === 'tema_central') return 'A1_agente_tema_central';
	return d.grupo === 'componente' ? 'A2_agente_componente' : 'A3_agente_debil';
}

/** Versión del agente: cambia cuando cambia el texto del criterio. */
export function versionAgente(criterio) {
	return `agente-${createHash('sha256').update(criterio).digest('hex').slice(0, 8)}`;
}

/** Celda de CSV según RFC 4180. */
export function celda(v) {
	const t = v === null || v === undefined ? '' : String(v);
	return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}
export const fila = (v) => v.map(celda).join(',');

/** Lee un CSV completo (RFC 4180) a objetos, con la primera fila como encabezado. */
export function leerCsv(texto) {
	const filas = [];
	let r = [];
	let c = '';
	let q = false;
	const s = texto.replace(/^﻿/, '');
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		if (q) {
			if (ch === '"') {
				if (s[i + 1] === '"') (c += '"'), i++;
				else q = false;
			} else c += ch;
		} else if (ch === '"') q = true;
		else if (ch === ',') (r.push(c), (c = ''));
		else if (ch === '\r') continue;
		else if (ch === '\n') (r.push(c), filas.push(r), (r = []), (c = ''));
		else c += ch;
	}
	if (c !== '' || r.length) (r.push(c), filas.push(r));
	const [enc, ...datos] = filas;
	return datos.filter((f) => f.length > 1 || f[0] !== '').map((f) => Object.fromEntries(enc.map((k, i) => [k, f[i] ?? ''])));
}

/**
 * Decisiones del agente que hay que volver a tomar: las hechas con una versión anterior del criterio y las de proyectos
 * que se publicaron como ley después de decidirse (`fecha_consulta_senado` es la última vez que cambió el estado, así que
 * una decisión posterior a ese cambio ya vio el proyecto publicado). Las del desarrollador y las de la lista v5 no se tocan.
 */
export function sqlReclasificar(version, maximo) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	if (!Number.isInteger(maximo) && maximo !== 1e9) throw new Error('El máximo debe ser un entero.');
	return `SELECT c.boletin, c.incluye FROM clasificacion_genero c JOIN proyecto_ley p ON p.boletin = c.boletin
WHERE c.codificador = 'agente'
  AND (c.version <> '${version}' OR (p.estado_senado = 'Publicado' AND c.clasificado < p.fecha_consulta_senado))
ORDER BY c.boletin LIMIT ${maximo};`;
}

/** Consulta del informe de la lista v5: por señal que decidió cada inclusión, cuánto revisó el agente y cuánto sacaría. */
export const SQL_INFORME_V5 = `
SELECT c.codificador || '/' || coalesce(c.nivel_senal, '-') AS senal, count(*) AS en_v5, count(r.boletin) AS revisados,
  count(*) FILTER (WHERE r.boletin IS NOT NULL AND NOT r.incluye) AS saldria,
  count(*) FILTER (WHERE NOT r.incluye AND r.confianza = 'alta') AS saldria_alta,
  count(*) FILTER (WHERE NOT r.incluye AND r.confianza = 'media') AS saldria_media,
  count(*) FILTER (WHERE NOT r.incluye AND r.confianza = 'baja') AS saldria_baja,
  count(*) FILTER (WHERE r.sin_texto IS NOT NULL) AS sin_texto
FROM clasificacion_genero c LEFT JOIN revision_v5 r ON r.boletin = c.boletin
WHERE c.incluye AND c.codificador IN ('regla', 'claude') GROUP BY 1 ORDER BY 2 DESC, 1;`;

/** Versiones del criterio con que se hicieron las revisiones guardadas (una fila por proyecto, con la versión que la hizo). */
export const SQL_VERSIONES_V5 = 'SELECT version, count(*) AS n FROM revision_v5 GROUP BY 1 ORDER BY 2 DESC, 1;';

/** Hasta tres ejemplos por señal de lo que el agente sacaría con confianza alta, siempre los mismos (orden por huella). */
export const SQL_EJEMPLOS_V5 = `
SELECT senal, boletin, titulo, motivo FROM (
  SELECT c.codificador || '/' || coalesce(c.nivel_senal, '-') AS senal, c.boletin, p.titulo, r.motivo,
         row_number() OVER (PARTITION BY c.codificador, c.nivel_senal ORDER BY md5(c.boletin)) AS n
  FROM clasificacion_genero c JOIN revision_v5 r ON r.boletin = c.boletin
  JOIN proyecto_ley p ON p.boletin = c.boletin
  WHERE c.incluye AND c.codificador IN ('regla', 'claude') AND NOT r.incluye AND r.confianza = 'alta') x
WHERE n <= 3 ORDER BY senal, n;`;

/** Arma el informe en Markdown a partir de las filas de las dos consultas anteriores. */
export function informeV5Markdown({ version, fecha, filas, ejemplos, versiones = [] }) {
	const n = (x) => Number(x);
	const pct = (a, b) => (n(b) ? `${Math.round((100 * n(a)) / n(b))} %` : '—');
	const tot = filas.reduce((s, f) => ({ en: s.en + n(f.en_v5), rev: s.rev + n(f.revisados), sale: s.sale + n(f.saldria), alta: s.alta + n(f.saldria_alta) }), { en: 0, rev: 0, sale: 0, alta: 0 });
	const l = [`# Revisión de la lista v5 con el agente — ${fecha}`, '',
		`Criterio vigente del agente: \`${version}\`. Revisiones guardadas por versión del criterio: ${versiones.length ? versiones.map((v) => `\`${v.version}\` (${v.n})`).join(', ') : 'ninguna'}${versiones.some((v) => v.version !== version) ? '. **Parte de las revisiones se hizo con una versión anterior del criterio**, de modo que puede no reflejar las reglas vigentes' : ''}. ${versiones.reduce((s, v) => s + n(v.n), 0) > tot.rev ? `Hay ${versiones.reduce((s, v) => s + n(v.n), 0)} revisiones guardadas, pero ${versiones.reduce((s, v) => s + n(v.n), 0) - tot.rev} corresponden a proyectos que ya no son inclusiones automáticas de la lista (por ejemplo, con decisión manual del desarrollador) y no se cuentan abajo. ` : ''}El agente revisó ${tot.rev} de las ${tot.en} inclusiones de la lista v5 (${pct(tot.rev, tot.en)}), en orden aleatorio, y sacaría ${tot.sale} (${pct(tot.sale, tot.rev)} de lo revisado), ${tot.alta} de ellas con confianza alta. No se aplicó ningún cambio a la selección: cada fila es una decisión pendiente del desarrollador.`, '',
		'## Qué sacaría el agente, según la señal que incluyó cada proyecto', '',
		'La señal es la regla de la lista v5 que decidió la inclusión: título estricto (T1), título medio (T2), cuerpo firme (T3), cuerpo amplio (T4), materias del Senado (T5), lectura del texto de una ley por Claude (L) y conteo absoluto (V2). Decidir por señal evita revisar proyecto por proyecto.', '',
		'| Señal | En la lista v5 | Revisados | Sacaría | Parte de lo revisado | Con confianza alta | Media | Baja | Sin texto |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
		...filas.map((f) => `| ${f.senal} | ${f.en_v5} | ${f.revisados} | ${f.saldria} | ${pct(f.saldria, f.revisados)} | ${f.saldria_alta} | ${f.saldria_media} | ${f.saldria_baja} | ${f.sin_texto} |`), '',
		'Una proporción alta de salidas con confianza alta indica que la regla de esa señal incluye lo que el criterio actual deja fuera; una proporción alta con confianza media o baja indica dudas que el agente no resuelve solo. La muestra revisada es aleatoria, así que los porcentajes se estabilizan a medida que avanza la revisión.', '',
		'## Ejemplos de salidas con confianza alta', '',
		'Hasta tres por señal, siempre los mismos mientras no cambie la revisión. El motivo es texto del agente.', ''];
	let actual = null;
	for (const e of ejemplos) {
		if (e.senal !== actual) (l.push(`### ${e.senal}`, ''), (actual = e.senal));
		l.push(`- **${e.boletin}** — ${e.titulo.slice(0, 140)}  \n  ${e.motivo}`);
	}
	l.push('', '## Decisión del desarrollador', '', 'Por cada señal: mantener, sacar o revisar caso a caso. Lo que se decida se aplica como una sola operación por señal, con su motivo registrado.', '', '| Señal | Decisión |', '|---|---|', ...filas.map((f) => `| ${f.senal} | |`), '');
	return l.join('\n');
}
