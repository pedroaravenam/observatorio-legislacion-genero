// Accesibilidad técnica: axe-core (WCAG 2.1 A y AA) sobre cada ruta, en claro y oscuro y a dos anchos,
// más un recorrido solo con teclado. Uso: BASE=http://127.0.0.1:4173 node pruebas/accesibilidad.mjs
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { BASE, MOTORES, RUTAS, SALIDA, tabla } from './comun.mjs';

const navegador = await MOTORES.chromium.launch();
const hallazgos = [];
const grave = (i) => i === 'serious' || i === 'critical';

for (const [ancho, alto] of [
	[375, 800],
	[1280, 900]
]) {
	for (const esquema of ['light', 'dark']) {
		const ctx = await navegador.newContext({
			viewport: { width: ancho, height: alto },
			colorScheme: esquema
		});
		const p = await ctx.newPage();
		for (const [nombre, r] of Object.entries(RUTAS)) {
			await p.goto(BASE + r.ruta, { waitUntil: 'load' });
			const res = await new AxeBuilder({ page: p })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();
			for (const v of res.violations)
				hallazgos.push({
					ruta: nombre,
					ancho,
					esquema,
					regla: v.id,
					impacto: v.impact,
					nodos: v.nodes.length,
					ayuda: v.help,
					ejemplo: v.nodes[0]?.html.slice(0, 120)
				});
			console.log(
				`${ancho}px ${esquema} ${nombre}: ${res.violations.length} reglas con violaciones, ${res.passes.length} reglas cumplidas`
			);
		}
		await ctx.close();
	}
}

// Recorrido con teclado: llegar al buscador, buscar, filtrar por tema y abrir una ficha, sin usar el mouse.
const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const teclado = [];
await p.goto(BASE + '/');
// El enlace «Saltar al buscador» evita tabular por las barras del gráfico anual.
await p.keyboard.press('Tab');
await p.keyboard.press('Tab');
const saltoTexto = await p.evaluate(() => document.activeElement?.textContent?.trim());
await p.keyboard.press('Enter');
await p.keyboard.press('Tab');
const pasos = 3;
teclado.push({
	paso: 'saltar al buscador con el enlace de salto',
	ok: saltoTexto === 'Saltar al buscador',
	detalle: saltoTexto ?? ''
});
teclado.push({
	paso: 'llegar al buscador con Tab',
	ok: (await p.evaluate(() => document.activeElement?.id)) === 'q',
	detalle: `${pasos} pulsaciones`
});
const visible = await p.evaluate(() => {
	const e = document.activeElement;
	const s = getComputedStyle(e);
	return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2;
});
teclado.push({ paso: 'foco visible en el buscador', ok: visible, detalle: '' });
await p.keyboard.type('sala cuna');
await Promise.all([p.waitForURL(/q=sala/), p.keyboard.press('Enter')]);
teclado.push({
	paso: 'buscar con Enter',
	ok: /q=sala/.test(p.url()) && !/orden=/.test(p.url()),
	detalle: p.url().replace(BASE, '')
});
// Tras buscar la página se recarga y el foco vuelve al inicio; se retoma desde el buscador y se tabula hasta el primer resultado.
await p.waitForLoadState('load');
await p.focus('#q');
let n = 0;
while (n < 80 && !(await p.evaluate(() => document.activeElement?.closest('.titulo') !== null))) {
	await p.keyboard.press('Tab');
	n++;
}
await Promise.all([p.waitForURL(/\/boletin\//), p.keyboard.press('Enter')]);
teclado.push({
	paso: 'abrir una ficha con Tab y Enter',
	ok: /\/boletin\//.test(p.url()),
	detalle: `${n} Tab; ${p.url().replace(BASE, '')}`
});
await ctx.close();
await navegador.close();

const graves = hallazgos.filter((h) => grave(h.impacto));
console.log('\nViolaciones por regla (todas las rutas):');
const porRegla = Object.values(
	hallazgos.reduce(
		(a, h) => (
			(a[h.regla] ??= { regla: h.regla, impacto: h.impacto, apariciones: 0, ayuda: h.ayuda })
				.apariciones++,
			a
		),
		{}
	)
);
console.log(
	porRegla.length ? tabla(porRegla, ['regla', 'impacto', 'apariciones', 'ayuda']) : 'ninguna'
);
console.log(
	'\nTeclado:\n' +
		tabla(
			teclado.map((t) => ({ ...t, ok: t.ok ? 'pasa' : 'FALLA' })),
			['paso', 'ok', 'detalle']
		)
);
writeFileSync(`${SALIDA}/accesibilidad.json`, JSON.stringify({ hallazgos, teclado }, null, 1));
process.exit(graves.length || teclado.some((t) => !t.ok) ? 1 : 0);
