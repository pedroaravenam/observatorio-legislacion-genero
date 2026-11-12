// Utilidades compartidas por los guiones de prueba del sitio. Solo se usan contra una copia local o de pruebas.
import { mkdirSync } from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

export const BASE = (process.env.BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
export const SALIDA = process.env.SALIDA || './pruebas-salida';
mkdirSync(SALIDA, { recursive: true });

export const MOTORES = { chromium, firefox, webkit };
export const AUTOR = 'Fernández Allende, Maya';

/** Rutas que se recorren. `estado` es el código HTTP esperado y `espera` un selector que debe existir. */
export const RUTAS = {
	inicio: { ruta: '/', espera: '.hilo li' },
	lista: { ruta: '/proyectos', espera: '.lista .fila' },
	autor: { ruta: `/proyectos?autor=${encodeURIComponent(AUTOR)}`, espera: '.lista .fila' },
	camaraOrden: { ruta: '/proyectos?camara=Senado&orden=antiguos', espera: '.lista .fila' },
	autoria: { ruta: '/proyectos?autoria=mujeres', espera: '.lista .fila' },
	pertinencia: { ruta: '/proyectos?q=sala+cuna&orden=pertinencia', espera: '.lista .fila' },
	panorama: { ruta: '/panorama', espera: '[data-cifra="tema"]' },
	acerca: { ruta: '/acerca', espera: 'h1' },
	actualidad: { ruta: '/actualidad', espera: 'h1' },
	ficha: { ruta: '/boletin/11077-07', espera: 'h1' },
	// Un proyecto con relación débil (decisión manual del desarrollador): la lista lo marca y la ficha explica el nivel.
	nivelDebil: { ruta: '/proyectos?q=monumento+Arica', espera: '.relacion-debil' },
	fichaDebil: { ruta: '/boletin/7000-24', espera: 'h1' },
	error: { ruta: '/nada', espera: 'h1', estado: 404 }
};

const TODOS_LOS_ANCHOS = [
	[375, 800],
	[768, 900],
	[1280, 900]
];
// ANCHOS=768,1280 limita el recorrido a esos anchos.
const pedidos = process.env.ANCHOS?.split(',').map(Number);
export const ANCHOS = pedidos
	? TODOS_LOS_ANCHOS.filter(([a]) => pedidos.includes(a))
	: TODOS_LOS_ANCHOS;

/** Tabla en Markdown a partir de filas de objetos. */
export function tabla(filas, columnas) {
	const l = [`| ${columnas.join(' | ')} |`, `|${columnas.map(() => '---').join('|')}|`];
	for (const f of filas) l.push(`| ${columnas.map((c) => String(f[c] ?? '')).join(' | ')} |`);
	return l.join('\n');
}

/** Primer número entero con puntos de miles de un texto («2.154 proyectos» → 2154). */
export function primerNumero(texto) {
	const m = texto.match(/\d[\d.]*/);
	return m ? Number(m[0].replace(/\./g, '')) : NaN;
}
