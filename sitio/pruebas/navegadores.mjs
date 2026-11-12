// Compatibilidad: recorre las rutas y las funciones principales en Chromium, Firefox y WebKit,
// a tres anchos. Uso: BASE=http://127.0.0.1:4173 NAVEGADORES=chromium,firefox node pruebas/navegadores.mjs
import { writeFileSync } from 'node:fs';
import { ANCHOS, BASE, MOTORES, RUTAS, SALIDA, primerNumero, tabla } from './comun.mjs';

const motores = (process.env.NAVEGADORES || 'chromium,firefox,webkit').split(',');
const resultados = [];
const registrar = (motor, ancho, prueba, ok, detalle = '') => {
	resultados.push({ navegador: motor, ancho, prueba, resultado: ok ? 'pasa' : 'FALLA', detalle });
	if (!ok) console.log(`FALLA ${motor} ${ancho}px ${prueba}: ${detalle}`);
};

for (const motor of motores) {
	let navegador;
	try {
		navegador = await MOTORES[motor].launch();
	} catch (e) {
		registrar(motor, '-', 'arranque', false, String(e.message).split('\n')[0]);
		continue;
	}
	const version = navegador.version();
	console.log(`${motor} ${version}`);
	for (const [ancho, alto] of ANCHOS) {
		const ctx = await navegador.newContext({
			viewport: { width: ancho, height: alto },
			acceptDownloads: true
		});
		const p = await ctx.newPage();
		const errores = [];
		p.on('pageerror', (e) => errores.push(`excepción: ${e.message}`));
		p.on('console', (m) => m.type() === 'error' && errores.push(m.text()));

		for (const [nombre, r] of Object.entries(RUTAS)) {
			errores.length = 0;
			const resp = await p.goto(BASE + r.ruta, { waitUntil: 'load' });
			// Se espera a que la página termine de hidratar antes de pasar a la siguiente: si se la abandona a medio cargar,
			// WebKit cancela la precarga de estilos y lo informa como error de la página que viene.
			await p.waitForLoadState('networkidle');
			const esperado = r.estado ?? 200;
			registrar(
				motor,
				ancho,
				`${nombre}: responde ${esperado}`,
				resp.status() === esperado,
				`recibió ${resp.status()}`
			);
			const hay = (await p.locator(r.espera).count()) > 0;
			registrar(motor, ancho, `${nombre}: se muestra ${r.espera}`, hay);
			const desborde = await p.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth
			);
			registrar(motor, ancho, `${nombre}: sin desborde horizontal`, desborde <= 0, `${desborde}px`);
			// En la página de error el propio 404 queda registrado en la consola; no cuenta como falla.
			const propios = r.estado ? errores.filter((t) => !/404|Not Found/i.test(t)) : errores;
			registrar(
				motor,
				ancho,
				`${nombre}: sin errores de consola`,
				propios.length === 0,
				propios.join(' | ').slice(0, 200)
			);
		}

		// Filtro: elegir un tema y aplicar reduce el total.
		await p.goto(BASE + '/proyectos');
		const antes = primerNumero(await p.textContent('.resumen'));
		await p.selectOption('#tema', 'violencia');
		await Promise.all([
			p.waitForURL(/tema=violencia/),
			p.click('button:has-text("Aplicar filtros")')
		]);
		const despues = primerNumero(await p.textContent('.resumen'));
		registrar(
			motor,
			ancho,
			'filtro por tema envía y cambia el total',
			despues > 0 && despues < antes,
			`${antes} → ${despues}`
		);

		// Autor: el campo tiene su lista de nombres.
		await p.goto(BASE + '/proyectos');
		const nombres = await p.locator('#autores option').count();
		const enlazado = await p.getAttribute('#autor', 'list');
		registrar(
			motor,
			ancho,
			'campo de autor con lista de nombres',
			enlazado === 'autores' && nombres > 100,
			`${nombres} nombres`
		);

		// Una búsqueda nueva ordena por pertinencia: el formulario no debe arrastrar un orden por fecha.
		await p.goto(BASE + '/proyectos');
		await p.fill('#q', 'sala cuna');
		await Promise.all([p.waitForURL(/q=sala/), p.click('.busqueda-fila button')]);
		registrar(
			motor,
			ancho,
			'buscar palabras ordena por pertinencia',
			!/orden=/.test(p.url()) && (await p.inputValue('#orden')) === 'pertinencia',
			p.url().replace(BASE, '')
		);

		// Orden: cambiar el selector reenvía el formulario y conserva los filtros.
		await p.goto(BASE + '/proyectos?q=sala+cuna&camara=Senado');
		await p.selectOption('#orden', 'antiguos');
		await Promise.all([p.waitForURL(/orden=antiguos/), p.click('.campo-orden button')]);
		const u = p.url();
		registrar(
			motor,
			ancho,
			'ordenar con el botón conserva los filtros',
			/orden=antiguos/.test(u) && /q=sala/.test(u) && /camara=Senado/.test(u),
			u.replace(BASE, '')
		);

		// Paginación: «Siguiente» avanza a otra página con otros proyectos.
		await p.goto(BASE + '/proyectos');
		const primero = await p.textContent('.fila .boletin');
		await Promise.all([p.waitForURL(/pagina=2/), p.click('a[rel="next"]')]);
		const segundo = await p.textContent('.fila .boletin');
		registrar(
			motor,
			ancho,
			'paginación avanza',
			primero !== segundo,
			`${primero.trim()} → ${segundo.trim()}`
		);

		// Descarga: el enlace CSV baja un archivo con nombre y contenido.
		await p.goto(BASE + '/proyectos?tema=violencia');
		const [descarga] = await Promise.all([
			p.waitForEvent('download'),
			p.click('.descarga a:has-text("CSV")')
		]);
		const nombreArchivo = descarga.suggestedFilename();
		const ruta = await descarga.path();
		const { statSync } = await import('node:fs');
		registrar(
			motor,
			ancho,
			'descarga CSV',
			/^proyectos-genero-\d{4}-\d{2}-\d{2}\.csv$/.test(nombreArchivo) && statSync(ruta).size > 1000,
			`${nombreArchivo}, ${statSync(ruta).size} bytes`
		);

		// Los enlaces antiguos al buscador, que vivía en la portada, llegan a /proyectos con sus filtros.
		await p.goto(BASE + '/?tema=violencia&estado=Publicado');
		registrar(
			motor,
			ancho,
			'enlace antiguo de la portada redirige al buscador',
			/\/proyectos\?tema=violencia&estado=Publicado$/.test(p.url()),
			p.url().replace(BASE, '')
		);

		// Tema: el botón alterna entre claro y oscuro, cambia el fondo y se recuerda al recargar.
		await p.goto(BASE + '/');
		const fondo = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
		const fondoAntes = await fondo();
		await p.click('button.tema');
		const temaElegido = await p.evaluate(() => document.documentElement.dataset.theme);
		const fondoDespues = await fondo();
		await p.reload();
		const temaRecordado = await p.evaluate(() => document.documentElement.dataset.theme);
		registrar(
			motor,
			ancho,
			'selector de tema cambia el fondo y se recuerda',
			fondoAntes !== fondoDespues && Boolean(temaElegido) && temaRecordado === temaElegido,
			`${fondoAntes} → ${fondoDespues}; ${temaElegido}`
		);
		await p.evaluate(() => localStorage.removeItem('tema'));

		// Gráfico anual y panorama.
		await p.goto(BASE + '/panorama');
		const barras = await p.locator('.grafico .barras li').count();
		const alto0 = await p.evaluate(() =>
			Math.max(
				...[...document.querySelectorAll('.grafico .barras .columna')].map(
					(e) => e.getBoundingClientRect().height
				)
			)
		);
		registrar(
			motor,
			ancho,
			'gráfico anual se dibuja',
			barras >= 30 && alto0 > 10,
			`${barras} barras, la más alta ${Math.round(alto0)}px`
		);
		await p.goto(BASE + '/panorama');
		const bloques = await p.locator('section.bloque').count();
		const tarjetas = await p.locator('[data-cifra="origen"]').count();
		registrar(
			motor,
			ancho,
			'panorama muestra sus bloques',
			bloques >= 5 && tarjetas === 2,
			`${bloques} bloques, ${tarjetas} tarjetas de origen`
		);
		await ctx.close();
	}
	await navegador.close();
	resultados.push({
		navegador: motor,
		ancho: '-',
		prueba: 'versión',
		resultado: 'info',
		detalle: version
	});
}

const fallas = resultados.filter((r) => r.resultado === 'FALLA');
const resumen = motores.map((m) => {
	const r = resultados.filter((x) => x.navegador === m && x.resultado !== 'info');
	return {
		navegador: m,
		versión:
			resultados.find((x) => x.navegador === m && x.prueba === 'versión')?.detalle ?? 'no arrancó',
		pruebas: r.length,
		fallas: r.filter((x) => x.resultado === 'FALLA').length
	};
});
console.log(tabla(resumen, ['navegador', 'versión', 'pruebas', 'fallas']));
writeFileSync(`${SALIDA}/navegadores.json`, JSON.stringify(resultados, null, 1));
process.exit(fallas.length ? 1 : 0);
