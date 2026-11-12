// Consistencia entre la base y lo que muestra el sitio: cifras del Panorama, totales de la portada,
// descargas y una muestra de fichas. Uso: OBSERVATORIO_DB=ruta BASE=http://127.0.0.1:4173 \
//   node --disable-warning=ExperimentalWarning pruebas/consistencia.mjs
import { writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { BASE, MOTORES, SALIDA, primerNumero, tabla } from './comun.mjs';

const db = new DatabaseSync(process.env.OBSERVATORIO_DB, { readOnly: true });
const filas = [];
const comparar = (grupo, cifra, esperado, mostrado) => {
	const ok = String(esperado) === String(mostrado);
	filas.push({ grupo, cifra, base: esperado, sitio: mostrado, coincide: ok ? 'sí' : 'NO' });
	if (!ok) console.log(`NO COINCIDE ${grupo} ${cifra}: base=${esperado} sitio=${mostrado}`);
};
const SEL = 'FROM seleccion_genero g JOIN proyecto p ON p.boletin = g.boletin';
const uno = (sql, ...a) => db.prepare(sql).get(...a);
const todos = (sql, ...a) => db.prepare(sql).all(...a);
const mediana = (v) => {
	if (!v.length) return '';
	const s = [...v].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const dias = (r) =>
	r.fecha_ingreso && r.diario_oficial
		? Math.round((Date.parse(r.diario_oficial) - Date.parse(r.fecha_ingreso)) / 86_400_000)
		: null;

const navegador = await MOTORES.chromium.launch();
const p = await (await navegador.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const attr = (sel, a) => p.getAttribute(sel, a);

// 1. Panorama frente a la base.
await p.goto(BASE + '/panorama');
const total = uno(`SELECT count(*) n ${SEL}`).n;
const leyes = uno(`SELECT count(*) n ${SEL} WHERE p.estado = 'Publicado'`).n;
const tram = uno(`SELECT count(*) n ${SEL} WHERE p.estado = 'En tramitación'`).n;
comparar('estados', 'total', total, await attr('[data-cifra="estados"]', 'data-total'));
comparar('estados', 'leyes', leyes, await attr('[data-cifra="estados"]', 'data-leyes'));
comparar(
	'estados',
	'en tramitación',
	tram,
	await attr('[data-cifra="estados"]', 'data-tramitacion')
);
comparar(
	'estados',
	'cerrados',
	total - leyes - tram,
	await attr('[data-cifra="estados"]', 'data-cerrados')
);
// Se quita «desde 1990» para que el año no se lea como una cifra.
const texto = (await p.textContent('.bajada')).replace(/\s+/g, ' ').replace(/desde \d{4}/, '');
const visibles = [...texto.matchAll(/\d[\d.]*/g)].map((m) => Number(m[0].replace(/\./g, '')));
comparar(
	'estados',
	'texto visible: total, leyes, tramitación, cerrados',
	[total, leyes, tram, total - leyes - tram].join(','),
	visibles.slice(0, 4).join(',')
);

for (const ini of ['Mensaje', 'Moción']) {
	const r = todos(
		`SELECT p.fecha_ingreso, p.diario_oficial, p.estado ${SEL} WHERE p.iniciativa = ?`,
		ini
	);
	const tarjeta = `[data-cifra="origen"][data-iniciativa="${ini}"]`;
	comparar(`origen ${ini}`, 'total', r.length, await attr(tarjeta, 'data-total'));
	comparar(
		`origen ${ini}`,
		'leyes',
		r.filter((x) => x.estado === 'Publicado').length,
		await attr(tarjeta, 'data-leyes')
	);
	const med = mediana(
		r
			.filter((x) => x.estado === 'Publicado')
			.map(dias)
			.filter((d) => d !== null && d >= 0)
	);
	comparar(
		`origen ${ini}`,
		'mediana de días hasta la ley',
		med,
		await attr(tarjeta, 'data-mediana')
	);
}
comparar(
	'cámaras',
	'Cámara de Diputados',
	uno(`SELECT count(*) n ${SEL} WHERE p.camara_origen = 'Cámara de Diputados'`).n,
	await attr('[data-cifra="camaras"]', 'data-diputados')
);
comparar(
	'cámaras',
	'Senado',
	uno(`SELECT count(*) n ${SEL} WHERE p.camara_origen = 'Senado'`).n,
	await attr('[data-cifra="camaras"]', 'data-senado')
);

// Autoría por sexo de las mociones: cada categoría coincide con la base y la descarga filtrada trae las mismas filas.
for (const [categoria, atributo] of [
	['mujeres', 'data-mujeres'],
	['hombres', 'data-hombres'],
	['mixta', 'data-mixta']
]) {
	comparar(
		'autoría',
		categoria,
		uno(`SELECT count(*) n ${SEL} WHERE p.iniciativa = 'Moción' AND p.autoria = '${categoria}'`).n,
		await attr('[data-cifra="autoria"]', atributo)
	);
}
comparar(
	'autoría',
	'sin dato',
	uno(
		`SELECT count(*) n ${SEL} WHERE p.iniciativa = 'Moción' AND p.autoria NOT IN ('mujeres', 'hombres', 'mixta')`
	).n,
	await attr('[data-cifra="autoria"]', 'data-sin-dato')
);

// Autores: cada nombre listado tiene el conteo de la base, el valor visible coincide y nadie fuera de la lista supera al último.
const autoresPagina = await p.$$eval('[data-cifra="autor"]', (els) =>
	els.map((e) => ({
		nombre: e.dataset.nombre,
		total: e.dataset.total,
		leyes: e.dataset.leyes,
		visible: e.querySelector('.b-valor').textContent
	}))
);
for (const a of autoresPagina) {
	const r = uno(
		`SELECT count(*) total, sum(p.estado = 'Publicado') leyes ${SEL}, json_each(p.autores) j WHERE j.value = ?`,
		a.nombre
	);
	comparar(`autor ${a.nombre}`, 'proyectos', r.total, a.total);
	comparar(`autor ${a.nombre}`, 'leyes', r.leyes, a.leyes);
	comparar(`autor ${a.nombre}`, 'valor visible', r.total, primerNumero(a.visible));
}
const ultimo = Math.min(...autoresPagina.map((a) => Number(a.total)));
const mayores = todos(
	`SELECT j.value nombre, count(*) n ${SEL}, json_each(p.autores) j GROUP BY j.value HAVING n > ? `,
	ultimo
).map((r) => r.nombre);
comparar(
	'autores',
	'nadie fuera de la lista supera al último',
	0,
	mayores.filter((n) => !autoresPagina.some((a) => a.nombre === n)).length
);
comparar(
	'autores',
	'cantidad de personas distintas',
	uno(`SELECT count(DISTINCT j.value) n ${SEL}, json_each(p.autores) j`).n,
	primerNumero((await p.textContent('#autores-titulo + .intro')) ?? '')
);

// Períodos y tiempos.
for (const [nombre, d, h] of [
	['1990–1999', 1990, 1999],
	['2000–2009', 2000, 2009],
	['2010–2017', 2010, 2017],
	['2018 en adelante', 2018, 9999]
]) {
	comparar(
		`período ${nombre}`,
		'proyectos',
		uno(`SELECT count(*) n ${SEL} WHERE p.anno BETWEEN ? AND ?`, d, h).n,
		await attr(`[data-cifra="periodo"][data-nombre="${nombre}"]`, 'data-total')
	);
	const ls = todos(
		`SELECT p.fecha_ingreso, p.diario_oficial ${SEL} WHERE p.estado = 'Publicado' AND p.anno BETWEEN ? AND ?`,
		d,
		h
	)
		.map(dias)
		.filter((x) => x !== null && x >= 0);
	comparar(
		`período ${nombre}`,
		'leyes con plazo',
		ls.length,
		await attr(`[data-cifra="tiempo"][data-nombre="${nombre}"]`, 'data-leyes')
	);
	comparar(
		`período ${nombre}`,
		'mediana de días',
		mediana(ls),
		await attr(`[data-cifra="tiempo"][data-nombre="${nombre}"]`, 'data-mediana')
	);
}

// Temas: el Panorama, la portada filtrada y la descarga deben dar el mismo número.
const temas = await p.$$eval('[data-cifra="tema"]', (els) =>
	els.map((e) => ({
		clave: e.dataset.clave,
		total: e.dataset.total,
		leyes: e.dataset.leyes,
		visible: e.querySelector('.b-valor').textContent
	}))
);
for (const t of temas) {
	comparar(`tema ${t.clave}`, 'valor visible = atributo', t.total, primerNumero(t.visible));
	await p.goto(`${BASE}/proyectos?tema=${t.clave}`);
	comparar(
		`tema ${t.clave}`,
		'portada con ?tema=',
		t.total,
		primerNumero(await p.textContent('.resumen'))
	);
	const json = await (await p.request.get(`${BASE}/datos/proyectos.json?tema=${t.clave}`)).json();
	comparar(`tema ${t.clave}`, 'descarga JSON', t.total, json.total);
	await p.goto(`${BASE}/proyectos?tema=${t.clave}&estado=Publicado`);
	comparar(
		`tema ${t.clave}`,
		'leyes (portada con estado=Publicado)',
		t.leyes,
		p.url() && primerNumero(await p.textContent('.resumen'))
	);
}

// Portada y descargas: la selección completa.
await p.goto(BASE + '/proyectos');
comparar('portada', 'total de la selección', total, primerNumero(await p.textContent('.resumen')));
const csv = await (await p.request.get(BASE + '/datos/proyectos.csv')).text();
comparar('descarga', 'filas del CSV', total, csv.split('\r\n').filter(Boolean).length - 1);

// 2. Muestra de fichas, con semilla fija.
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
const larga = (iso) =>
	iso
		? `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`
		: '';
let semilla = 20261103;
const azar = () => (
	(semilla = (semilla + 0x6d2b79f5) | 0),
	(Math.imul(semilla ^ (semilla >>> 15), 1 | semilla) >>> 0) / 4294967296
);
const boletines = todos('SELECT boletin FROM seleccion_genero ORDER BY boletin').map(
	(r) => r.boletin
);
const muestra = new Set();
while (muestra.size < 30) muestra.add(boletines[Math.floor(azar() * boletines.length)]);
for (const b of [...muestra].sort()) {
	const r = uno('SELECT * FROM proyecto WHERE boletin = ?', b);
	await p.goto(`${BASE}/boletin/${b}`);
	const sp = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
	comparar(`ficha ${b}`, 'título', sp(r.titulo), sp(await p.textContent('h1')));
	comparar(
		`ficha ${b}`,
		'estado',
		r.estado ?? '',
		sp(
			await p
				.locator('.encabezado .estado')
				.first()
				.textContent({ timeout: 500 })
				.catch(() => '')
		)
	);
	comparar(
		`ficha ${b}`,
		'fecha de ingreso',
		larga(r.fecha_ingreso),
		sp(
			await p
				.locator('dt:text-is("Ingreso") + dd')
				.textContent({ timeout: 500 })
				.catch(() => '')
		)
	);
	const ley = sp(
		await p
			.locator('dd.ley')
			.textContent({ timeout: 500 })
			.catch(() => '')
	);
	comparar(`ficha ${b}`, 'número de ley', r.ley_numero ?? '', ley ? ley.replace(/,.*$/, '') : '');
}
// Lo que no cumple el criterio no se muestra: sin ficha (404) y sin aparecer en la búsqueda por número.
const fuera = todos(
	'SELECT boletin FROM proyecto WHERE boletin NOT IN (SELECT boletin FROM seleccion_genero) ORDER BY boletin'
).map((r) => r.boletin);
const muestraFuera = new Set();
while (muestraFuera.size < 10) muestraFuera.add(fuera[Math.floor(azar() * fuera.length)]);
for (const b of [...muestraFuera].sort()) {
	const resp = await p.goto(`${BASE}/boletin/${b}`);
	comparar(`fuera ${b}`, 'la ficha responde 404', 404, resp.status());
	await p.goto(`${BASE}/proyectos?q=${encodeURIComponent(b)}`);
	comparar(
		`fuera ${b}`,
		'la búsqueda por número no lo muestra',
		'Sin resultados',
		(await p.textContent('.resumen')).replace(/\s+/g, ' ').trim()
	);
}
await navegador.close();

const fallas = filas.filter((f) => f.coincide !== 'sí');
const grupos = Object.values(
	filas.reduce((a, f) => {
		const g = f.grupo.replace(/^(ficha|autor|tema|fuera) .*/, '$1');
		a[g] ??= { grupo: g, comparaciones: 0, coinciden: 0 };
		a[g].comparaciones++;
		if (f.coincide === 'sí') a[g].coinciden++;
		return a;
	}, {})
);
console.log(tabla(grupos, ['grupo', 'comparaciones', 'coinciden']));
console.log(`Total: ${filas.length} comparaciones, ${fallas.length} sin coincidir`);
writeFileSync(`${SALIDA}/consistencia.json`, JSON.stringify(filas, null, 1));
process.exit(fallas.length ? 1 : 0);
