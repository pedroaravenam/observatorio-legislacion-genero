// Genera el logo del Observatorio (hemiciclo) en todas sus versiones.
// Uso, desde `sitio/`:  node diseno/generar-logo.mjs
// Escribe en `diseno/logo/` y además regenera los archivos que usa el sitio:
//   src/lib/assets/favicon.svg, static/apple-touch-icon.png y static/imagen-compartir.png.
// Requiere `npm install` (Playwright con Chromium y las tipografías @fontsource-variable).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ruta = (...p) => raiz + p.join('/');
const salida = ruta('diseno/logo');
mkdirSync(salida, { recursive: true });

// Paleta del sitio (src/app.css).
const C = {
	violeta: '#3a1f63',
	violetaClaro: '#c3b0ea',
	verde: '#1f6e4a',
	verdeClaro: '#7fd3a5',
	franja: '#2b1748',
	tinta: '#1d1527',
	tintaSuave: '#5d5569',
	textoOscuro: '#f3eefb',
	textoOscuroSuave: '#cbbde3'
};

// --- Geometría: tres semicírculos concéntricos; en cada uno, un tramo verde (lo que llegó a ser ley). ---
const n = (x) => String(+x.toFixed(2));
const pt = (cx, cy, r, a) =>
	n(cx + r * Math.cos((a * Math.PI) / 180)) + ' ' + n(cy - r * Math.sin((a * Math.PI) / 180));
const tramo = (cx, cy, r, a1, a2) => `M${pt(cx, cy, r, a1)}A${r} ${r} 0 0 1 ${pt(cx, cy, r, a2)}`;
const marca = (v, g, { cx = 32, cy = 46, radios = [9, 17, 25], w = 5.4 } = {}) =>
	`<g fill="none" stroke-width="${w}"><path stroke="${v}" d="${radios.map((r) => tramo(cx, cy, r, 180, 78) + tramo(cx, cy, r, 34, 0)).join('')}"/><path stroke="${g}" d="${radios.map((r) => tramo(cx, cy, r, 72, 40)).join('')}"/></g>`;
const svg = (vb, cuerpo, extra = '') =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${cuerpo}</svg>\n`;

// --- Versiones sin letras (viewBox 64×64) ---
const fondoSello = (color, rx) => `<rect width="64" height="64" rx="${rx}" fill="${color}"/>`;
const sinLetras = {
	sello: svg('0 0 64 64', fondoSello(C.violeta, 13) + marca(C.violetaClaro, C.verdeClaro)),
	'sello-cuadrado': svg(
		'0 0 64 64',
		fondoSello(C.violeta, 0) + marca(C.violetaClaro, C.verdeClaro)
	),
	'marca-para-fondo-claro': svg('0 0 64 64', marca(C.violeta, C.verde)),
	'marca-para-fondo-oscuro': svg('0 0 64 64', marca(C.violetaClaro, C.verdeClaro)),
	'marca-negro': svg('0 0 64 64', marca('#000', '#000')),
	'marca-blanco': svg('0 0 64 64', marca('#fff', '#fff'))
};

// --- Versiones con letras: sello a la izquierda y el nombre en dos líneas (tipografías del sitio). ---
const fuente = (paquete, archivo) =>
	'data:font/woff2;base64,' +
	readFileSync(ruta('node_modules/@fontsource-variable', paquete, 'files', archivo)).toString(
		'base64'
	);
const PUBLIC = fuente('public-sans', 'public-sans-latin-wght-normal.woff2');
const NEWS = fuente('newsreader', 'newsreader-latin-wght-normal.woff2');
const estilo = `<style>@font-face{font-family:'Public Sans Variable';src:url(${PUBLIC});font-weight:100 900}</style>`;
const conLetras = (selloSvg, tinta, suave) =>
	svg(
		'0 0 352 64',
		`${estilo}<g>${selloSvg}</g><text x="80" y="25" font-family="'Public Sans Variable'" font-size="16" fill="${suave}">Observatorio de</text><text x="80" y="52" font-family="'Public Sans Variable'" font-size="26" font-weight="600" fill="${tinta}">Legislación de Género</text>`
	);
const interior = (s) => s.replace(/^<svg[^>]*>|<\/svg>\s*$/g, '');
const horizontal = {
	'horizontal-para-fondo-claro': conLetras(interior(sinLetras.sello), C.tinta, C.tintaSuave),
	'horizontal-para-fondo-oscuro': conLetras(interior(sinLetras.sello), '#eeeaf3', '#b4abc0'),
	'horizontal-marca-para-fondo-claro': conLetras(
		interior(sinLetras['marca-para-fondo-claro']),
		C.tinta,
		C.tintaSuave
	),
	'horizontal-marca-para-fondo-oscuro': conLetras(
		interior(sinLetras['marca-para-fondo-oscuro']),
		'#eeeaf3',
		'#b4abc0'
	)
};
const todas = { ...sinLetras, ...horizontal };
for (const [nombre, contenido] of Object.entries(todas))
	writeFileSync(`${salida}/${nombre}.svg`, contenido);

// --- Archivos del sitio ---
writeFileSync(ruta('src/lib/assets/favicon.svg'), sinLetras.sello);
const cuadrado = sinLetras['sello-cuadrado'];

// Imagen para compartir (1200×630): arcos enormes que salen por la derecha y el nombre a la izquierda.
const fondoGrande = svg(
	'0 0 1200 630',
	marca('#4a2c7a', '#2f8f63', { cx: 930, cy: 630, radios: [150, 270, 390, 510], w: 78 }),
	' style="position:absolute;inset:0"'
);
const selloOg = sinLetras.sello
	.replace('<svg ', '<svg width="92" height="92" ')
	.replace(C.violeta, '#4a2c7a');
const og = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:N;src:url(${NEWS});font-weight:200 800}
@font-face{font-family:P;src:url(${PUBLIC});font-weight:100 900}
body{margin:0;width:1200px;height:630px;background:${C.franja};color:${C.textoOscuro};position:relative;overflow:hidden;font-family:P}
.t{position:absolute;left:80px;top:60px;bottom:60px;width:640px;display:flex;flex-direction:column}
.s svg{display:block}.a{font-size:30px;color:${C.textoOscuroSuave};margin-top:34px}
h1{font-family:N;font-weight:600;font-size:86px;line-height:1.02;letter-spacing:-1.5px;margin:6px 0 0}
p{font-size:28px;line-height:1.35;color:${C.textoOscuroSuave};margin:26px 0 0;max-width:540px}
.d{margin-top:auto;font-size:26px;font-weight:600;color:${C.verdeClaro}}
</style>${fondoGrande}<div class="t"><div class="s">${selloOg}</div><div class="a">Observatorio de</div><h1>Legislación de&nbsp;Género</h1><p>Los proyectos de ley sobre género en Chile, desde 1990.</p><div class="d">legislaciongenero.cl</div></div>`;

// --- PNG ---
const navegador = await chromium.launch();
async function png(html, ancho, alto, archivo, { transparente = false, escala = 1 } = {}) {
	const p = await navegador.newPage({
		viewport: { width: ancho, height: alto },
		deviceScaleFactor: escala
	});
	await p.setContent(html);
	await p.evaluate(() => document.fonts.ready);
	await p.screenshot({ path: archivo, omitBackground: transparente });
	await p.close();
}
const lienzo = (s, w, h) =>
	`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${s}`;
for (const nombre of Object.keys(sinLetras))
	await png(lienzo(sinLetras[nombre], 64, 64), 64, 64, `${salida}/${nombre}.png`, {
		transparente: true,
		escala: 16
	});
for (const nombre of Object.keys(horizontal))
	await png(lienzo(horizontal[nombre], 352, 64), 352, 64, `${salida}/${nombre}.png`, {
		transparente: true,
		escala: 6
	});
await png(lienzo(cuadrado, 180, 180), 180, 180, ruta('static/apple-touch-icon.png'));
await png(og, 1200, 630, ruta('static/imagen-compartir.png'));
await png(og, 1200, 630, `${salida}/imagen-compartir.png`, { escala: 2 });
await navegador.close();
console.log(
	'Listo: ' +
		Object.keys(todas).length +
		' versiones en diseno/logo/ y archivos del sitio actualizados.'
);
