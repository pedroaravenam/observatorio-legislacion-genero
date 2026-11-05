// Pruebas de las funciones puras del clasificador. Uso: node --test despliegue/clasificador/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { construirEvidencia, contarLexico, esLimiteDeUso, textoRtf, fila, fragmentos, leerCsv, nivelSenal, normalizarIgualLargo, validarDecision, versionAgente } from './lib.mjs';

test('normalizar conserva el largo y quita tildes', () => {
	const t = 'Violación y Género: ¿Año nuevo?';
	const n = normalizarIgualLargo(t);
	assert.equal(n.length, t.length);
	assert.equal(n, 'violacion y genero: ¿ano nuevo?');
});

test('cuenta apariciones del léxico y calcula la densidad', () => {
	const t = 'La sala cuna es un derecho. ' + 'x '.repeat(5000) + 'Violencia contra la mujer. Violencia intrafamiliar.';
	const r = contarLexico(t);
	assert.ok(r.apariciones >= 3, `apariciones: ${r.apariciones}`);
	assert.ok(Math.abs(r.densidad - (r.apariciones / t.length) * 10_000) < 1e-9);
});

test('un texto sin léxico no tiene apariciones ni fragmentos', () => {
	const r = contarLexico('Reajusta el monto del impuesto territorial de bienes raíces.');
	assert.equal(r.apariciones, 0);
	assert.deepEqual(fragmentos('abc', r.posiciones), []);
});

test('los fragmentos salen del texto original y no se solapan', () => {
	const t = 'Inicio. ' + 'relleno '.repeat(100) + 'La igualdad de género es el objeto. ' + 'relleno '.repeat(100);
	const r = contarLexico(t);
	const f = fragmentos(t, r.posiciones, 5, 40);
	assert.ok(f.length >= 1 && f.every((x) => x.length <= 200));
	assert.ok(f.some((x) => x.includes('igualdad de género')), 'conserva tildes del original');
});

test('valida la decisión y rechaza incoherencias', () => {
	const ok = validarDecision({ decision: 'incluye', grupo: 'componente', confianza: 'media', motivo: 'Regula el postnatal parental con efecto en las madres.' });
	assert.deepEqual([ok.incluye, ok.grupo], [true, 'componente']);
	assert.throws(() => validarDecision({ decision: 'incluye', grupo: 'fuera', confianza: 'alta', motivo: 'Motivo largo suficiente.' }));
	assert.throws(() => validarDecision({ decision: 'excluye', grupo: 'fuera', confianza: 'quizás', motivo: 'Motivo largo suficiente.' }));
	assert.throws(() => validarDecision({ decision: 'excluye', grupo: 'fuera', confianza: 'alta', motivo: 'corto' }));
	assert.equal(validarDecision({ decision: 'excluye', grupo: 'fuera', confianza: 'alta', motivo: 'Menciona a las mujeres -- solo de paso en una lista.' }).motivo.includes('--'), false);
});

test('el grupo débil entra con su propia señal', () => {
	const d = validarDecision({ decision: 'incluye', grupo: 'debil', confianza: 'media', motivo: 'Relación débil: ley general de no discriminación.' });
	assert.equal(d.incluye, true);
	assert.equal(nivelSenal(d), 'A3_agente_debil');
	assert.throws(() => validarDecision({ decision: 'excluye', grupo: 'debil', confianza: 'alta', motivo: 'Motivo largo suficiente.' }));
});

test('la señal depende del grupo y los excluidos no tienen señal', () => {
	assert.equal(nivelSenal({ incluye: true, grupo: 'tema_central' }), 'A1_agente_tema_central');
	assert.equal(nivelSenal({ incluye: true, grupo: 'componente' }), 'A2_agente_componente');
	assert.equal(nivelSenal({ incluye: false, grupo: 'fuera' }), null);
});

test('reconoce los mensajes de límite de uso', () => {
	assert.ok(esLimiteDeUso("You've hit your limit · resets 3pm"));
	assert.ok(esLimiteDeUso('API Error: 429 rate_limit_error'));
	assert.ok(!esLimiteDeUso('El motivo es demasiado corto'));
});

test('RTF: decodifica tildes, saltos de línea y omite tablas de fuentes', () => {
	const rtf = "{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}{\\*\\generator x;}\\pard Protecci\\'f3n de la mujer\\par Art\\'edculo \\u241?o\\par}";
	assert.equal(textoRtf(rtf).trim(), 'Protección de la mujer\nArtículo ño');
});

test('la versión cambia con el criterio', () => {
	assert.notEqual(versionAgente('a'), versionAgente('b'));
	assert.match(versionAgente('a'), /^agente-[0-9a-f]{8}$/);
});

test('la evidencia indica cuando el texto no está disponible', () => {
	const e = construirEvidencia({ boletin: '1-01', titulo: 'T', iniciativa: 'Moción', camara: 'Senado', fecha_ingreso: '2026-10-01', materias: '' }, null);
	assert.match(e, /NO DISPONIBLE/);
	assert.match(e, /\(ninguna\)/);
});

test('CSV: ida y vuelta con comas, comillas y saltos de línea', () => {
	const texto = `a,b\r\n${fila(['x,y', 'dijo "hola"'])}\r\n${fila(['uno\ndos', ''])}\r\n`;
	assert.deepEqual(leerCsv(texto), [{ a: 'x,y', b: 'dijo "hola"' }, { a: 'uno\ndos', b: '' }]);
});

test('la reevaluación incluye versiones anteriores y proyectos publicados después de decidirse, solo del agente', async () => {
	const { sqlReclasificar } = await import('./lib.mjs');
	const sql = sqlReclasificar('agente-abc123', 50);
	assert.match(sql, /c\.codificador = 'agente'/);
	assert.match(sql, /c\.version <> 'agente-abc123'/);
	assert.match(sql, /p\.estado_senado = 'Publicado' AND c\.clasificado < p\.fecha_consulta_senado/);
	assert.throws(() => sqlReclasificar("x'; DROP TABLE y;--", 5));
	assert.throws(() => sqlReclasificar('agente-abc123', '5; DROP'));
});

test('el informe de la lista v5 calcula porcentajes y deja una fila de decisión por señal', async () => {
	const { informeV5Markdown } = await import('./lib.mjs');
	const md = informeV5Markdown({
		version: 'agente-abc123', fecha: '2026-11-04',
		filas: [{ senal: 'regla/T4_cuerpo_amplio', en_v5: '200', revisados: '100', saldria: '90', saldria_alta: '60', saldria_media: '25', saldria_baja: '5', sin_texto: '8' }],
		ejemplos: [{ senal: 'regla/T4_cuerpo_amplio', boletin: '123-07', titulo: 'Título', motivo: 'Motivo' }],
		versiones: [{ version: 'agente-vieja', n: '100' }]
	});
	assert.match(md, /Parte de las revisiones se hizo con una versión anterior del criterio/);
	assert.match(md, /revisó 100 de las 200 inclusiones de la lista v5 \(50 %\)/);
	assert.match(md, /\| regla\/T4_cuerpo_amplio \| 200 \| 100 \| 90 \| 90 % \| 60 \| 25 \| 5 \| 8 \|/);
	assert.match(md, /\| regla\/T4_cuerpo_amplio \| \|/);
	assert.match(md, /\*\*123-07\*\* — Título/);
});

test('el cruce pide mitad de lo que el otro sacó y mitad de lo que dejó, y solo señales discutibles', async () => {
	const { sqlCruce } = await import('./lib.mjs');
	const sql = sqlCruce('agente-abc123', 'claude', 40);
	assert.match(sql, /r\.revisor <> 'claude'/);
	assert.equal((sql.match(/LIMIT 20/g) ?? []).length, 2);
	assert.match(sql, /r\.incluye = false/);
	assert.match(sql, /r\.incluye = true/);
	assert.match(sql, /\^\(T2\|T3\|T4\|T5\|L_\)/);
	assert.throws(() => sqlCruce('agente-abc123', "x'; DROP", 40));
	assert.throws(() => sqlCruce('agente-abc123', 'claude', 3.5));
});

test('el informe del cruce cuenta acuerdos y detalla cada desacuerdo con ambos motivos', async () => {
	const { informeCruceMarkdown } = await import('./lib.mjs');
	const caso = (b, o, s) => ({ boletin: b, titulo: `Título ${b}`, senal: 'regla/T4_cuerpo_amplio',
		original: { revisor: 'claude', incluye: o, grupo: o ? 'componente' : 'fuera', confianza: 'alta', motivo: `m-claude-${b}`, sin_texto: null },
		segundo: { revisor: 'codex', incluye: s, grupo: s ? 'componente' : 'fuera', confianza: 'media', motivo: `m-codex-${b}`, sin_texto: null } });
	const md = informeCruceMarkdown({ version: 'v', fecha: '2026-11-05', filas: [caso('1-01', false, false), caso('2-01', false, true), caso('3-01', true, true)] });
	assert.match(md, /\| claude → codex \| 3 \| 2 \(67 %\) \| 1 \| 2 \(67 %\) \|/);
	assert.match(md, /### 2-01 — Título 2-01/);
	assert.doesNotMatch(md, /### 1-01/);
	assert.match(md, /m-claude-2-01/);
	assert.match(md, /m-codex-2-01/);
});

test('aplicar la revisión v5 se hace en una transacción que se revierte si la cuenta no es la esperada', async () => {
	const { sqlAplicarV5, sqlConteoAplicarV5 } = await import('./lib.mjs');
	const manuales = [{ boletin: '154-07', grupo: 'componente', version: 'manual-2026-11-05', motivo: "Es d'ella" }];
	const sql = sqlAplicarV5({ version: 'agente-abc123', esperadas: 623, manuales });
	assert.match(sql, /^BEGIN;/);
	assert.match(sql, /COMMIT;/);
	assert.match(sql, /IF n <> 623 THEN RAISE EXCEPTION/);
	assert.match(sql, /motivo = 'Es d''ella'/);
	assert.ok(sql.indexOf("WHERE boletin = '154-07'") < sql.indexOf('WITH aplicadas'), 'las decisiones manuales van antes de las del agente');
	assert.match(sql, /c\.codificador IN \('regla', 'claude'\)/);
	assert.throws(() => sqlAplicarV5({ version: 'agente-abc123', esperadas: 0, manuales }));
	assert.throws(() => sqlAplicarV5({ version: "x'; DROP", esperadas: 5, manuales }));
	assert.throws(() => sqlAplicarV5({ version: 'agente-abc123', esperadas: 5, manuales: [{ ...manuales[0], grupo: 'otro' }] }));
	const conteo = sqlConteoAplicarV5('agente-abc123', ['154-07', "1'-07"]);
	assert.match(conteo, /NOT IN \('154-07','1''-07'\)/);
	assert.doesNotMatch(conteo, /UPDATE|DELETE|INSERT/);
});
