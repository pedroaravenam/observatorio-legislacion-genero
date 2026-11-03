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
	const grupos = ['tema_central', 'componente', 'fuera'];
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

/** Señal registrada para una decisión del agente. */
export function nivelSenal(d) {
	if (!d.incluye) return null;
	return d.grupo === 'tema_central' ? 'A1_agente_tema_central' : 'A2_agente_componente';
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
