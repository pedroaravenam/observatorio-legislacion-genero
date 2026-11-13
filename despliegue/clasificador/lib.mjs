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
// Primero las inclusiones (lo que está en el sitio) y después las exclusiones; en tandas, cada noche sigue donde quedó la anterior
// porque lo repasado ya tiene la versión vigente.
export function sqlReclasificar(version, maximo) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	if (!Number.isInteger(maximo) && maximo !== 1e9) throw new Error('El máximo debe ser un entero.');
	return `SELECT c.boletin, c.incluye FROM clasificacion_genero c JOIN proyecto_ley p ON p.boletin = c.boletin
WHERE c.codificador = 'agente'
  AND (c.version <> '${version}' OR (p.estado_senado = 'Publicado' AND c.clasificado < p.fecha_consulta_senado))
ORDER BY c.incluye DESC, c.boletin LIMIT ${maximo};`;
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

/** Casos para que un agente dé su segunda opinión sobre lo que revisó el otro: mitad que el otro sacó, mitad que dejó. */
export function sqlCruce(version, revisor, n) {
	if (!/^[\w.-]+$/.test(version) || !/^[a-z]+$/.test(revisor) || !Number.isInteger(n) || n < 2 || n > 400) throw new Error('Parámetros de cruce no válidos.');
	const base = (incluye) => `SELECT c.boletin, c.codificador || '/' || coalesce(c.nivel_senal, '-') AS senal, r.revisor AS revisor_original,
  r.incluye, r.grupo, r.confianza, r.motivo, r.sin_texto
  FROM revision_v5 r JOIN clasificacion_genero c ON c.boletin = r.boletin
  WHERE r.version = '${version}' AND r.revisor <> '${revisor}' AND c.incluye AND c.codificador IN ('regla', 'claude')
    AND c.nivel_senal ~ '^(T2|T3|T4|T5|L_)' AND r.incluye = ${incluye}
  ORDER BY md5(r.boletin || 'cruce') LIMIT ${n / 2}`;
	return `(${base(false)}) UNION ALL (${base(true)});`;
}

/** Informe de los casos en que dos agentes revisaron el mismo proyecto: acuerdo y detalle de cada desacuerdo. */
export function informeCruceMarkdown({ version, fecha, filas }) {
	const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : '—');
	const mismo = (f) => f.original.incluye === f.segundo.incluye;
	const grupoIgual = (f) => f.original.grupo === f.segundo.grupo;
	const desacuerdos = filas.filter((f) => !mismo(f));
	const l = [`# Segunda opinión cruzada sobre la lista v5 — ${fecha}`, '',
		`Criterio \`${version}\`. Cada proyecto lo revisó primero un agente y después el otro, con la misma evidencia, sin ver la decisión anterior. Son ${filas.length} proyectos de las señales T2, T3, T4, T5 y lectura de leyes, la mitad de los que el primer agente sacó y la mitad de los que dejó. No es una muestra aleatoria de la lista: sobrerrepresenta lo dudoso, así que el desacuerdo real de toda la lista es menor.`, '',
		'## Cuánto coinciden', '',
		'| Primer agente → segundo | Casos | Misma decisión | Distinta decisión | Mismo grupo |', '|---|---:|---:|---:|---:|'];
	for (const [a, b] of [['claude', 'codex'], ['codex', 'claude']]) {
		const c = filas.filter((f) => f.original.revisor === a && f.segundo.revisor === b);
		l.push(`| ${a} → ${b} | ${c.length} | ${c.filter(mismo).length} (${pct(c.filter(mismo).length, c.length)}) | ${c.filter((f) => !mismo(f)).length} | ${c.filter(grupoIgual).length} (${pct(c.filter(grupoIgual).length, c.length)}) |`);
	}
	const sacoPrimero = filas.filter((f) => !f.original.incluye);
	const dejoPrimero = filas.filter((f) => f.original.incluye);
	l.push('', '| Qué hizo el primero | Casos | El segundo coincide |', '|---|---:|---:|',
		`| Sacó el proyecto | ${sacoPrimero.length} | ${sacoPrimero.filter(mismo).length} (${pct(sacoPrimero.filter(mismo).length, sacoPrimero.length)}) |`,
		`| Lo dejó | ${dejoPrimero.length} | ${dejoPrimero.filter(mismo).length} (${pct(dejoPrimero.filter(mismo).length, dejoPrimero.length)}) |`, '',
		`## Los ${desacuerdos.length} desacuerdos`, '',
		'Por cada uno: qué dijo cada agente y por qué. La columna «Acierta» es para que el desarrollador marque quién tiene razón: primero, segundo, ninguno o dudoso. El texto de los motivos es de los agentes.', '');
	const etiqueta = (d) => `${d.revisor}: **${d.incluye ? `deja (${d.grupo})` : 'saca'}**, confianza ${d.confianza}${d.sin_texto ? `, sin texto (${d.sin_texto})` : ''}`;
	for (const f of desacuerdos.sort((a, b) => a.senal.localeCompare(b.senal) || a.boletin.localeCompare(b.boletin))) {
		l.push(`### ${f.boletin} — ${f.titulo.slice(0, 160)}`, '', `Señal de la v5: ${f.senal}`, '',
			`- ${etiqueta(f.original)}. ${f.original.motivo}`, `- ${etiqueta(f.segundo)}. ${f.segundo.motivo}`, '', 'Acierta: ', '');
	}
	return l.join('\n');
}

const GRUPOS_VALIDOS = ['tema_central', 'componente', 'debil'];
const lit = (s) => `'${String(s).replaceAll("'", "''")}'`;

/** Cuántas inclusiones de la lista v5 sacaría la revisión del agente, sin contar las decisiones manuales. Solo lee. */
export function sqlConteoAplicarV5(version, manuales) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	const excluidos = manuales.length ? manuales.map(lit).join(',') : "''";
	return `SELECT count(*) FILTER (WHERE NOT r.incluye AND r.boletin NOT IN (${excluidos})) AS a_sacar,
       (SELECT count(*) FROM clasificacion_genero WHERE incluye) AS incluidos
FROM revision_v5 r JOIN clasificacion_genero c ON c.boletin = r.boletin
WHERE r.version = '${version}' AND c.incluye AND c.codificador IN ('regla', 'claude');`;
}

/**
 * Aplica en una sola transacción lo que el desarrollador decidió: primero sus decisiones manuales (prevalecen) y luego las
 * salidas del agente. Si la cantidad de salidas no es exactamente la esperada, se revierte todo.
 */
export function sqlAplicarV5({ version, esperadas, manuales }) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	if (!Number.isInteger(esperadas) || esperadas < 1 || esperadas > 2000) throw new Error('La cantidad esperada debe ser un entero entre 1 y 2000.');
	for (const m of manuales) {
		if (!/^\d{1,6}-\d{2}$/.test(m.boletin) || !GRUPOS_VALIDOS.includes(m.grupo) || !m.motivo || m.motivo.length > 600 || !/^[\w.-]+$/.test(m.version))
			throw new Error(`Decisión manual no válida: ${m.boletin}`);
	}
	const manual = manuales.map((m) => `UPDATE clasificacion_genero SET incluye = true, grupo = ${lit(m.grupo)}, nivel_senal = 'M_decision_manual',
  version = ${lit(m.version)}, codificador = 'desarrollador', confianza = NULL, motivo = ${lit(m.motivo)}, clasificado = now()
  WHERE boletin = ${lit(m.boletin)};`).join('\n');
	return `BEGIN;
${manual}
DO $$ DECLARE n int; BEGIN
  WITH aplicadas AS (
    UPDATE clasificacion_genero c SET incluye = false, grupo = 'fuera', nivel_senal = NULL, version = r.version, codificador = 'agente',
      confianza = r.confianza, motivo = r.motivo, clasificado = now()
    FROM revision_v5 r
    WHERE r.boletin = c.boletin AND r.version = '${version}' AND NOT r.incluye AND c.incluye AND c.codificador IN ('regla', 'claude')
    RETURNING 1)
  SELECT count(*) INTO n FROM aplicadas;
  IF n <> ${esperadas} THEN RAISE EXCEPTION 'Se esperaban ${esperadas} exclusiones y salieron %; no se aplica nada.', n; END IF;
END $$;
COMMIT;
SELECT count(*) AS incluidos_ahora FROM clasificacion_genero WHERE incluye;`;
}

// --- Validación manual de casos límite -----------------------------------------------------------------------------
// Un caso es límite cuando el agente lo incluye como «debil» sin confianza alta, o lo excluye sin confianza alta.
// Esos casos no se publican hasta que el desarrollador los valida.

/** ¿Hay que pedir validación manual de esta decisión del agente? */
export function esCasoLimite(d) {
	if (d.confianza === 'alta') return false;
	return d.incluye ? d.grupo === 'debil' : true;
}

const BOLETIN = /^\d{1,6}-\d{2}$/;

/** Agrega a la cola de validación las decisiones límite. No toca los casos ya validados y refresca los pendientes. */
export function sqlEncolar(decisiones, version) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	const filas = decisiones.filter(esCasoLimite);
	if (!filas.length) return null;
	for (const d of filas) if (!BOLETIN.test(d.boletin)) throw new Error(`Boletín con formato inválido: ${d.boletin}`);
	const valores = filas.map((d) => `(${lit(d.boletin)}, 'pendiente', ${d.incluye ? 'true' : 'false'}, ${lit(d.grupo)}, ${lit(d.confianza)}, ${lit(d.motivo)}, ${lit(version)})`).join(',\n');
	return `INSERT INTO validacion_genero (boletin, estado, agente_incluye, agente_grupo, agente_confianza, agente_motivo, version) VALUES
${valores}
ON CONFLICT (boletin) DO UPDATE SET agente_incluye = EXCLUDED.agente_incluye, agente_grupo = EXCLUDED.agente_grupo,
  agente_confianza = EXCLUDED.agente_confianza, agente_motivo = EXCLUDED.agente_motivo, version = EXCLUDED.version
WHERE validacion_genero.estado = 'pendiente';`;
}

/** Encola lo ya publicado como débil sin confianza alta (vale también para cualquier lista de boletines). Solo agrega. */
export function sqlEncolarPublicados(version) {
	if (!/^[\w.-]+$/.test(version)) throw new Error('Versión de criterio no válida.');
	return `INSERT INTO validacion_genero (boletin, estado, agente_incluye, agente_grupo, agente_confianza, agente_motivo, version)
SELECT boletin, 'pendiente', incluye, grupo, confianza, motivo, version FROM clasificacion_genero
WHERE incluye AND codificador = 'agente' AND grupo = 'debil' AND confianza IN ('media', 'baja')
ON CONFLICT (boletin) DO NOTHING;`;
}

export const SQL_PUBLICADOS_LIMITE = `SELECT count(*) AS n FROM clasificacion_genero c
WHERE incluye AND codificador = 'agente' AND grupo = 'debil' AND confianza IN ('media', 'baja')
  AND NOT EXISTS (SELECT 1 FROM validacion_genero v WHERE v.boletin = c.boletin);`;

/** La cola, con lo que hace falta para decidir: título, motivo del agente y fecha de ingreso. */
export const SQL_COLA = `SELECT v.boletin, btrim(regexp_replace(p.titulo, '\\s+', ' ', 'g')) AS titulo, p.fecha_ingreso, v.agente_incluye, v.agente_grupo,
  v.agente_confianza, v.agente_motivo, coalesce(c.incluye, false) AS publicado
FROM validacion_genero v JOIN proyecto_ley p ON p.boletin = v.boletin LEFT JOIN clasificacion_genero c ON c.boletin = v.boletin
WHERE v.estado = 'pendiente' ORDER BY p.fecha_ingreso DESC, v.boletin;`;

/**
 * Aplica los veredictos del desarrollador en una transacción: cierra la validación y deja su decisión como manual,
 * que el agente no reclasifica. Veredicto: { boletin, incluye, grupo?, razon }.
 */
export function sqlResolver(veredictos, hoy) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(hoy)) throw new Error('Fecha no válida.');
	if (!veredictos.length) throw new Error('No hay veredictos.');
	const sentencias = veredictos.map((v) => {
		if (!BOLETIN.test(v.boletin) || typeof v.incluye !== 'boolean' || !v.razon || v.razon.length > 600) throw new Error(`Veredicto no válido: ${v.boletin}`);
		if (v.incluye && !GRUPOS_VALIDOS.includes(v.grupo)) throw new Error(`Falta un grupo válido para incluir ${v.boletin}`);
		const clasif = v.incluye
			? `incluye = true, grupo = ${lit(v.grupo)}, nivel_senal = 'M_decision_manual'`
			: `incluye = false, grupo = 'fuera', nivel_senal = NULL`;
		return `UPDATE validacion_genero SET estado = 'validado', veredicto = ${v.incluye}, grupo_veredicto = ${v.incluye ? lit(v.grupo) : 'NULL'}, razon = ${lit(v.razon)}, validado = now()
  WHERE boletin = ${lit(v.boletin)} AND estado = 'pendiente';
UPDATE clasificacion_genero SET ${clasif}, version = ${lit(`manual-${hoy}`)}, codificador = 'desarrollador', confianza = NULL, motivo = ${lit(v.razon)}, clasificado = now()
  WHERE boletin = ${lit(v.boletin)};
INSERT INTO clasificacion_genero (boletin, incluye, grupo, nivel_senal, version, codificador, motivo)
  SELECT ${lit(v.boletin)}, ${v.incluye}, ${v.incluye ? lit(v.grupo) : "'fuera'"}, ${v.incluye ? "'M_decision_manual'" : 'NULL'}, ${lit(`manual-${hoy}`)}, 'desarrollador', ${lit(v.razon)}
  WHERE NOT EXISTS (SELECT 1 FROM clasificacion_genero WHERE boletin = ${lit(v.boletin)})
    AND EXISTS (SELECT 1 FROM validacion_genero WHERE boletin = ${lit(v.boletin)} AND estado = 'validado');`;
	});
	return `BEGIN;
${sentencias.join('\n')}
COMMIT;
SELECT count(*) AS pendientes_ahora FROM validacion_genero WHERE estado = 'pendiente';`;
}

/** Casos validados, para dar precedentes al agente y medir su coincidencia con el desarrollador. */
export const SQL_VALIDADOS = `SELECT v.boletin, btrim(regexp_replace(p.titulo, '\\s+', ' ', 'g')) AS titulo, v.agente_incluye, v.agente_grupo, v.agente_confianza,
  v.veredicto, v.grupo_veredicto, v.razon, to_char(v.validado, 'YYYY-MM-DD') AS validado
FROM validacion_genero v JOIN proyecto_ley p ON p.boletin = v.boletin WHERE v.estado = 'validado' ORDER BY v.validado;`;

const sinTildes = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const VACIAS = new Set(['proyecto', 'ley', 'modifica', 'establece', 'sobre', 'para', 'otras', 'otros', 'materia', 'materias', 'entre', 'texto', 'codigo', 'normas', 'norma', 'dicta', 'crea', 'regula', 'declara', 'artculo']);
const palabras = (t) => new Set(sinTildes(t).match(/[a-z]{4,}/g)?.filter((w) => !VACIAS.has(w)) ?? []);

/** Los k casos validados más parecidos por palabras del título (solo los que comparten alguna). */
export function ejemplosParecidos(titulo, validados, k = 5) {
	const mias = palabras(titulo);
	return validados
		.map((v) => ({ v, comunes: [...palabras(v.titulo)].filter((w) => mias.has(w)).length }))
		.filter((x) => x.comunes > 0)
		.sort((a, b) => b.comunes - a.comunes || (b.v.validado ?? '').localeCompare(a.v.validado ?? ''))
		.slice(0, k)
		.map((x) => x.v);
}

/** Bloque de precedentes que se agrega a la evidencia. Vacío si no hay casos parecidos. */
export function bloqueEjemplos(ejemplos) {
	if (!ejemplos.length) return '';
	const l = ['', 'Precedentes: casos parecidos que el desarrollador ya resolvió. Sigue su razonamiento cuando el objeto del proyecto sea el mismo.'];
	ejemplos.forEach((e, i) => l.push(`${i + 1}. «${e.titulo.slice(0, 160)}» → ${e.veredicto === 't' || e.veredicto === true ? `INCLUYE (${e.grupo_veredicto})` : 'EXCLUYE'}. Razón: ${e.razon}`));
	return l.join('\n');
}

/** Coincidencia entre lo que recomendó el agente y lo que decidió el desarrollador, por mes de validación. */
export function resumenAcuerdo(validados, pendientes) {
	const bool = (x) => x === true || x === 't';
	const meses = new Map();
	for (const v of validados) {
		const mes = (v.validado ?? '').slice(0, 7);
		const m = meses.get(mes) ?? { total: 0, coincide: 0 };
		m.total++;
		if (bool(v.agente_incluye) === bool(v.veredicto)) m.coincide++;
		meses.set(mes, m);
	}
	const total = validados.length;
	const coincide = [...meses.values()].reduce((s, m) => s + m.coincide, 0);
	return { total, coincide, pendientes, porMes: [...meses].sort(([a], [b]) => a.localeCompare(b)).map(([mes, m]) => ({ mes, ...m })) };
}

/**
 * Muestra al azar para repasar con el criterio vigente, además de lo decidido con un criterio anterior: algunas inclusiones de la lista
 * v5 (hechas por regla o por Claude) y algunas exclusiones por defecto de proyectos desde 2018. Lo que el agente repasa queda con su
 * decisión y su versión, así que no se repite en la muestra siguiente.
 */
export function sqlMuestraAzar(incluidas, excluidas) {
	if (!Number.isInteger(incluidas) || !Number.isInteger(excluidas) || incluidas < 0 || excluidas < 0 || incluidas + excluidas > 500) throw new Error('Tamaño de muestra no válido.');
	return `(SELECT c.boletin, c.incluye FROM clasificacion_genero c WHERE c.incluye AND c.codificador IN ('regla', 'claude') ORDER BY random() LIMIT ${incluidas})
UNION ALL
(SELECT c.boletin, c.incluye FROM clasificacion_genero c JOIN proyecto_ley p ON p.boletin = c.boletin
 WHERE NOT c.incluye AND c.codificador = 'v5' AND p.fecha_ingreso >= '2018-01-01' ORDER BY random() LIMIT ${excluidas});`;
}
