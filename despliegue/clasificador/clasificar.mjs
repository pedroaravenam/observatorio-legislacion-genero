#!/usr/bin/env node
// Clasificador del Observatorio: aplica el criterio de selección de género a los proyectos nuevos con un agente
// (Claude en modo sin interfaz) y guarda cada decisión, con su motivo, en la base de ingesta del VPS.
//   node clasificar.mjs pendientes [--max N] [--simulacro]   clasifica lo que no tiene decisión y publica
//   node clasificar.mjs validar [--n 60]                      mide al agente contra la lista v5 (no escribe en la base)
//   node clasificar.mjs sembrar                               carga una vez las decisiones de la lista v5
//   node clasificar.mjs probar [--casos ruta]                 prueba al agente con casos de control (casos-control.json)
//   node clasificar.mjs revisar-v5 [--max 450]                segunda opinión del agente sobre la lista v5 (no cambia la selección)
//   node clasificar.mjs informe-v5 [--archivo ruta.md]        resume esa segunda opinión por señal de la lista v5 (solo lee)
// Variables: VPS (atendia-development), CLASIFICADOR_MODELO (sonnet), CONCURRENCIA (3), SALIDA (./clasificador-salida).
import { execFile, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { SQL_EJEMPLOS_V5, sqlAplicarV5, sqlConteoAplicarV5, SQL_INFORME_V5, SQL_VERSIONES_V5, informeCruceMarkdown, sqlCruce, construirEvidencia, contarLexico, esLimiteDeUso, fila, fragmentos, informeV5Markdown, leerCsv, nivelSenal, sqlReclasificar, textoRtf, validarDecision, versionAgente } from './lib.mjs';
import { TEMAS } from '../../sitio/src/lib/temas.ts';

const ejecutar = promisify(execFile);
const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..');
const vps = process.env.VPS || 'atendia-development';
// Quién responde: claude (CLI de Claude) o codex (CLI de Codex). Cada trabajador usa su propio cupo de uso.
const revisor = process.env.REVISOR || 'claude';
const modeloClaude = process.env.CLASIFICADOR_MODELO || 'sonnet';
const concurrencia = Number(process.env.CONCURRENCIA || 3);
const salida = process.env.SALIDA || './clasificador-salida';
const criterio = readFileSync(join(aqui, 'criterio.md'), 'utf8');
const version = versionAgente(criterio);
const DIAS_ESPERA_TEXTO = 14;
// Código de salida cuando se agota el límite de uso: el trabajo nocturno lo distingue de un error.
const CODIGO_LIMITE = 4;
const esquema = {
	type: 'object',
	properties: {
		decision: { type: 'string', enum: ['incluye', 'excluye'] },
		grupo: { type: 'string', enum: ['tema_central', 'componente', 'debil', 'fuera'] },
		confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
		motivo: { type: 'string' }
	},
	required: ['decision', 'grupo', 'confianza', 'motivo']
};

// Al primer límite de uso se detiene todo: seguir llamando no sirve y gasta el cupo que se renueve.
let limiteAlcanzado = false;
const args = process.argv.slice(2);
const orden = args[0];
const opcion = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);

/** Ejecuta SQL en la base de ingesta del VPS (por la entrada estándar de psql) y devuelve la salida. */
async function psql(sql) {
	return new Promise((resolve, reject) => {
		const p = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', vps,
			'cd /opt/observatorio && sudo docker compose -p observatorio exec -T db psql -U observatorio -d observatorio -X -q -v ON_ERROR_STOP=1 --csv -f -']);
		let o = '';
		let e = '';
		p.stdout.on('data', (d) => (o += d));
		p.stderr.on('data', (d) => (e += d));
		p.on('close', (c) => (c === 0 ? resolve(o) : reject(new Error(`psql terminó con ${c}: ${e.slice(0, 500)}`))));
		p.stdin.end(sql);
	});
}

const ENTIDADES = [[/&amp;/g, '&'], [/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&apos;/g, "'"]];
const decodificar = (s) => ENTIDADES.reduce((t, [re, v]) => t.replace(re, v), s ?? '');

/** Proyectos de la base de ingesta con su documento y materias. Sin lista, los que aún no tienen decisión. */
async function obtenerProyectos(boletines) {
	let filtro = 'NOT EXISTS (SELECT 1 FROM clasificacion_genero g WHERE g.boletin = p.boletin)';
	if (boletines) {
		if (!boletines.every((b) => /^\d{1,6}-\d{2}$/.test(b))) throw new Error('Boletín con formato inválido');
		filtro = `p.boletin IN (${boletines.map((b) => `'${b}'`).join(',')})`;
	}
	const csv = await psql(`
WITH f AS (
  SELECT p.boletin, p.fecha_ingreso, p.titulo, t.nombre AS iniciativa, c.nombre AS camara,
         CASE WHEN xml_is_well_formed_document(r.contenido)
              THEN (xpath(format('/proyectos/proyecto[descripcion/boletin="%s"]', p.boletin), r.contenido::xml))[1] END AS x
  FROM proyecto_ley p
  LEFT JOIN tipo_iniciativa t ON t.id = p.tipo_iniciativa_id
  LEFT JOIN camara c ON c.id = p.camara_origen_id
  LEFT JOIN respuesta_cruda r ON r.id = p.respuesta_senado_id
  WHERE ${filtro})
SELECT boletin, fecha_ingreso, btrim(regexp_replace(titulo, '\\s+', ' ', 'g')) AS titulo, iniciativa, camara,
       replace((xpath('/proyecto/descripcion/link_mensaje_mocion/text()', x))[1]::text, 'http://', 'https://') AS url,
       (SELECT coalesce(string_agg(btrim(m::text), ' | '), '') FROM unnest(xpath('/proyecto/materias/materia/DESCRIPCION/text()', x)) m) AS materias
FROM f ORDER BY fecha_ingreso, boletin;`);
	return leerCsv(csv).map((r) => ({ ...r, url: decodificar(r.url), materias: decodificar(r.materias) }));
}

/** Texto plano de un .docx: el XML principal sin etiquetas, con un salto de línea por párrafo. */
function textoDocx(xml) {
	return ENTIDADES.reduce((t, [re, v]) => t.replace(re, v), xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, ''));
}

/** Descarga el documento del proyecto (PDF, Word .docx o .doc) y devuelve su texto, o null con el motivo. */
async function obtenerTexto(url) {
	if (!url) return { texto: null, motivo: 'el proyecto no tiene documento' };
	const dir = mkdtempSync(join(tmpdir(), 'clasificador-'));
	try {
		const archivo = join(dir, 'documento');
		await ejecutar('curl', ['-sL', '-A', 'Mozilla/5.0', '--max-time', '90', '-o', archivo, url]);
		const bytes = readFileSync(archivo);
		if (bytes.length < 100) return { texto: null, motivo: 'el Senado aún no publica el documento' };
		let texto;
		if (bytes.subarray(0, 5).toString() === '%PDF-') {
			await ejecutar('pdftotext', ['-layout', archivo, join(dir, 'd.txt')], { timeout: 120_000 });
			texto = readFileSync(join(dir, 'd.txt'), 'utf8');
		} else if (bytes.subarray(0, 2).toString() === 'PK') {
			const { stdout } = await ejecutar('unzip', ['-p', archivo, 'word/document.xml'], { maxBuffer: 200 * 1024 * 1024 });
			texto = textoDocx(stdout);
		} else if (bytes.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
			const { stdout } = await ejecutar('catdoc', ['-w', '-s', 'cp1252', '-d', 'utf-8', archivo], { maxBuffer: 200 * 1024 * 1024, timeout: 120_000 });
			texto = stdout;
		} else if (bytes.subarray(0, 5).toString() === '{\\rtf') {
			texto = textoRtf(bytes.toString('latin1'));
		} else return { texto: null, motivo: 'el documento no es PDF, Word ni RTF' };
		return texto.replace(/\s/g, '').length < 500 ? { texto: null, motivo: 'el documento no tiene texto legible' } : { texto };
	} catch (e) {
		return { texto: null, motivo: `no se pudo descargar o leer el documento (${String(e.message).split('\n')[0].slice(0, 80)})` };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function analizar(texto) {
	const r = contarLexico(texto);
	return { largo: r.largo, apariciones: r.apariciones, densidad: r.densidad, inicio: texto.replace(/\s+/g, ' ').trim().slice(0, 1500), fragmentos: fragmentos(texto, r.posiciones) };
}

/**
 * Modelo de Codex: gpt-6-luna con razonamiento alto, que fijó el desarrollador. No se usa el rol «ligero» de OMP porque
 * alterna entre modelos de distintos proveedores en cada consulta y a veces devuelve uno que Codex no admite.
 * Se puede cambiar con CODEX_MODELO=openai-codex/<modelo>:<esfuerzo>.
 */
function modeloCodex() {
	const rol = process.env.CODEX_MODELO || 'openai-codex/gpt-6-luna:high';
	const [proveedor, resto] = rol.includes('/') ? rol.split('/') : ['openai-codex', rol];
	if (proveedor !== 'openai-codex') throw new Error(`CODEX_MODELO debe ser de openai-codex, no «${proveedor}»`);
	const [modelo, esfuerzo] = resto.split(':');
	return { modelo, esfuerzo: esfuerzo || 'high', etiqueta: `${proveedor}/${modelo}:${esfuerzo || 'high'}` };
}
const modelo = revisor === 'codex' ? modeloCodex().etiqueta : modeloClaude;

/** Pregunta a Codex con el mismo criterio. Ignora la configuración de usuario (un hook de inicio fallaba con un modelo no admitido), no guarda sesión y corre desde una carpeta vacía; la respuesta sale como JSON de un esquema. */
async function preguntarCodex(evidencia) {
	const vacio = mkdtempSync(join(tmpdir(), 'clasificador-codex-'));
	try {
		const { modelo: m, esfuerzo } = modeloCodex();
		writeFileSync(join(vacio, 'esquema.json'), JSON.stringify({ ...esquema, additionalProperties: false }));
		const prompt = `${criterio}\n\n---\n\nClasifica este proyecto de ley.\n\n${evidencia}`;
		// Para depurar: GUARDAR_PROMPT=<carpeta> deja el mensaje exacto que recibe Codex.
		if (process.env.GUARDAR_PROMPT) writeFileSync(join(process.env.GUARDAR_PROMPT, `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.txt`), prompt);
		for (let intento = 1; ; intento++) {
			try {
				await new Promise((resolve, reject) => {
					const p = spawn('codex', ['exec', '-m', m, '-c', `model_reasoning_effort=${esfuerzo}`, '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check',
						'--color', 'never', '-C', vacio, '--output-schema', join(vacio, 'esquema.json'), '-o', join(vacio, 'salida.json'), '-']);
					let o = '';
					const reloj = setTimeout(() => p.kill('SIGKILL'), 300_000);
					p.stdout.on('data', (d) => (o += d));
					p.stderr.on('data', (d) => (o += d));
					p.on('close', (c) => {
						clearTimeout(reloj);
						if (c !== 0 && process.env.GUARDAR_PROMPT) writeFileSync(join(process.env.GUARDAR_PROMPT, `error-codex-${Date.now()}.txt`), o);
						c === 0 ? resolve() : reject(new Error(`codex terminó con ${c}: ${o.slice(-300)}`));
					});
					p.stdin.end(prompt);
				});
				return validarDecision(JSON.parse(readFileSync(join(vacio, 'salida.json'), 'utf8')));
			} catch (e) {
				if (esLimiteDeUso(e.message)) {
					limiteAlcanzado = true;
					throw Object.assign(new Error(`Se agotó el límite de uso de Codex: ${e.message}`), { limite: true });
				}
				if (intento >= 2) throw e;
				await new Promise((r) => setTimeout(r, 5_000));
			}
		}
	} finally {
		rmSync(vacio, { recursive: true, force: true });
	}
}

/** Pregunta al agente. Sin herramientas, sin sesión guardada y desde una carpeta vacía, para que solo vea la evidencia. */
async function preguntar(evidencia) {
	if (revisor === 'codex') return preguntarCodex(evidencia);
	const vacio = mkdtempSync(join(tmpdir(), 'clasificador-agente-'));
	try {
		for (let intento = 1; ; intento++) {
			try {
				const salidaAgente = await new Promise((resolve, reject) => {
					const p = spawn('claude', ['-p', '--model', modeloClaude, '--output-format', 'json', '--tools', '', '--disable-slash-commands',
						'--strict-mcp-config', '--no-session-persistence', '--setting-sources', 'user', '--system-prompt', criterio,
						'--json-schema', JSON.stringify(esquema)], { cwd: vacio });
					let o = '';
					let e = '';
					const reloj = setTimeout(() => p.kill('SIGKILL'), 240_000);
					p.stdout.on('data', (d) => (o += d));
					p.stderr.on('data', (d) => (e += d));
					p.on('close', (c) => (clearTimeout(reloj), c === 0 ? resolve(o) : reject(new Error(`claude terminó con ${c}: ${(e || o).slice(0, 300)}`))));
					p.stdin.end(`Clasifica este proyecto de ley.\n\n${evidencia}`);
				});
				const j = JSON.parse(salidaAgente);
				if (j.is_error) throw new Error(`error del agente: ${String(j.result).slice(0, 200)}`);
				return validarDecision(j.structured_output ?? JSON.parse(j.result));
			} catch (e) {
				if (esLimiteDeUso(e.message)) {
					limiteAlcanzado = true;
					throw Object.assign(new Error(`Se agotó el límite de uso: ${e.message}`), { limite: true });
				}
				if (intento >= 2) throw e;
				await new Promise((r) => setTimeout(r, 5_000));
			}
		}
	} finally {
		rmSync(vacio, { recursive: true, force: true });
	}
}

async function enParalelo(items, trabajo) {
	const resultados = new Array(items.length);
	let i = 0;
	await Promise.all(Array.from({ length: Math.min(concurrencia, items.length) }, async () => {
		while (i < items.length && !limiteAlcanzado) {
			const k = i++;
			resultados[k] = await trabajo(items[k], k);
		}
	}));
	return resultados;
}

/** Clasifica un proyecto: lee su texto y consulta al agente. Devuelve null si conviene esperar al texto. */
async function clasificarUno(p, { esperarTexto }) {
	const { texto, motivo } = await obtenerTexto(p.url);
	const dias = (Date.now() - Date.parse(p.fecha_ingreso)) / 86_400_000;
	if (!texto && esperarTexto && dias < DIAS_ESPERA_TEXTO) return { boletin: p.boletin, espera: motivo };
	const analisis = texto ? analizar(texto) : null;
	const d = await preguntar(construirEvidencia(p, analisis));
	// Sin texto no se puede dar más que confianza media.
	if (!analisis && d.confianza === 'alta') d.confianza = 'media';
	return { boletin: p.boletin, titulo: p.titulo, ...d, nivel_senal: nivelSenal(d), apariciones: analisis?.apariciones ?? null, densidad: analisis?.densidad ?? null, sin_texto: analisis ? null : motivo };
}

async function guardar(decisiones) {
	if (!decisiones.length) return;
	const filas = decisiones.map((d) => fila([d.boletin, d.incluye, d.grupo, d.nivel_senal, version, 'agente', d.confianza, d.motivo]));
	await psql(`
CREATE TEMP TABLE nuevas (boletin text, incluye boolean, grupo text, nivel_senal text, version text, codificador text, confianza text, motivo text);
\\copy nuevas FROM STDIN WITH (FORMAT csv)
${filas.join('\n')}
\\.
INSERT INTO clasificacion_genero (boletin, incluye, grupo, nivel_senal, version, codificador, confianza, motivo)
SELECT boletin, incluye, grupo, nivel_senal, version, codificador, confianza, motivo FROM nuevas
ON CONFLICT (boletin) DO UPDATE SET incluye = EXCLUDED.incluye, grupo = EXCLUDED.grupo, nivel_senal = EXCLUDED.nivel_senal,
  version = EXCLUDED.version, codificador = EXCLUDED.codificador, confianza = EXCLUDED.confianza, motivo = EXCLUDED.motivo, clasificado = now();`);
}

async function pendientes() {
	const simulacro = args.includes('--simulacro');
	const maximo = Number(opcion('max', 1e9));
	// Con --reclasificar se repasan las decisiones del propio agente tomadas con una versión anterior del criterio.
	const reclasificar = args.includes('--reclasificar');
	let antes = new Map();
	let lista;
	if (reclasificar) {
		const viejas = leerCsv(await psql(sqlReclasificar(version, maximo)));
		antes = new Map(viejas.map((v) => [v.boletin, v.incluye === 't']));
		lista = viejas.length ? await obtenerProyectos(viejas.map((v) => v.boletin)) : [];
	} else lista = (await obtenerProyectos()).slice(0, maximo);
	console.log(`${reclasificar ? 'Decisiones del agente con un criterio anterior o de proyectos publicados como ley después de decidirse' : 'Proyectos sin decisión'}: ${lista.length}. Agente ${modelo}, criterio ${version}.`);
	let n = 0;
	const resultados = await enParalelo(lista, async (p) => {
		try {
			const r = await clasificarUno(p, { esperarTexto: true });
			console.log(`[${++n}/${lista.length}] ${p.boletin} ${r.espera ? `espera (${r.espera})` : `${r.incluye ? 'INCLUYE' : 'excluye'} ${r.grupo} (${r.confianza})${r.sin_texto ? ` SIN TEXTO: ${r.sin_texto}` : ''}`}`);
			return r;
		} catch (e) {
			console.error(`[${++n}/${lista.length}] ${p.boletin} FALLÓ: ${e.message}`);
			return { boletin: p.boletin, error: e.message };
		}
	});
	const decididos = resultados.filter((r) => r && r.grupo);
	const esperan = resultados.filter((r) => r?.espera);
	const fallos = resultados.filter((r) => r?.error);
	mkdirSync(salida, { recursive: true });
	writeFileSync(join(salida, `pendientes-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(resultados, null, 1));
	if (!simulacro) await guardar(decididos);
	console.log(`\nDecididos: ${decididos.length} (incluye ${decididos.filter((d) => d.incluye).length}). Esperan texto: ${esperan.length}. Fallos: ${fallos.length}.`);
	if (reclasificar) {
		const cambios = decididos.filter((d) => antes.get(d.boletin) !== d.incluye);
		console.log(`\nCambian respecto de la decisión anterior: ${cambios.length}.`);
		for (const d of cambios) console.log(`  ${d.boletin} ${antes.get(d.boletin) ? 'incluía → ahora excluye' : 'excluía → ahora INCLUYE'} [${d.grupo}, ${d.confianza}] ${d.titulo.slice(0, 90)}\n      ${d.motivo}`);
	}
	for (const d of decididos.filter((x) => x.incluye)) console.log(`  + ${d.boletin} [${d.grupo}, ${d.confianza}] ${d.titulo.slice(0, 90)}\n      ${d.motivo}`);
	if (simulacro) return console.log('\nSimulacro: no se guardó nada.');
	if (fallos.length === 0) await ssh('sudo mkdir -p /var/lib/observatorio-alertas && sudo touch /var/lib/observatorio-alertas/clasificacion-ok');
	if (decididos.length) {
		console.log('Publicando la base del sitio...');
		await ssh('sudo /opt/observatorio/trabajo.sh publicar');
	}
	if (limiteAlcanzado) process.exitCode = CODIGO_LIMITE;
	else if (fallos.length) process.exitCode = 1;
}

const ssh = (cmd) => ejecutar('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', vps, cmd], { timeout: 1_200_000 });

/** Carga una vez las decisiones de la lista v5: los incluidos con su señal y el resto de lo evaluado como excluido. */
async function sembrar() {
	const evaluados = leerCsv(readFileSync(join(raiz, 'datos/referencia/titulos-boletines-1990-2026.csv'), 'utf8'));
	const incluidos = new Map(leerCsv(readFileSync(join(raiz, 'datos/seleccion/candidatos-genero-v5.csv'), 'utf8')).map((r) => [r.boletin, r]));
	const enBase = new Set(leerCsv(await psql('SELECT boletin FROM proyecto_ley;')).map((r) => r.boletin));
	const filas = [];
	for (const e of evaluados) {
		if (!enBase.has(e.boletin)) continue;
		const i = incluidos.get(e.boletin);
		filas.push(i ? fila([e.boletin, true, '', i.nivel_senal, 'v5', i.codificador, '', '']) : fila([e.boletin, false, '', '', 'v5', 'v5', '', '']));
	}
	await psql(`
CREATE TEMP TABLE semilla (boletin text, incluye boolean, grupo text, nivel_senal text, version text, codificador text, confianza text, motivo text);
\\copy semilla FROM STDIN WITH (FORMAT csv)
${filas.join('\n')}
\\.
INSERT INTO clasificacion_genero (boletin, incluye, grupo, nivel_senal, version, codificador, confianza, motivo)
SELECT boletin, incluye, grupo, nivel_senal, version, codificador, confianza, motivo FROM semilla ON CONFLICT (boletin) DO NOTHING;`);
	const [r] = leerCsv(await psql('SELECT count(*) AS total, count(*) FILTER (WHERE incluye) AS incluye FROM clasificacion_genero;'));
	console.log(`Sembrado. En la tabla: ${r.total} decisiones, ${r.incluye} incluidas (la lista v5 trae ${incluidos.size}).`);
}

/** Mide al agente contra la lista v5 con una muestra: incluidos de cada señal, negativos con término en el título y negativos comunes. */
async function validar() {
	const n = Number(opcion('n', 60));
	const evaluados = leerCsv(readFileSync(join(raiz, 'datos/referencia/titulos-boletines-1990-2026.csv'), 'utf8'));
	const v5 = new Map(leerCsv(readFileSync(join(raiz, 'datos/seleccion/candidatos-genero-v5.csv'), 'utf8')).map((r) => [r.boletin, r]));
	let semilla = 20261103;
	const azar = () => ((semilla = (semilla + 0x6d2b79f5) | 0), (Math.imul(semilla ^ (semilla >>> 15), 1 | semilla) >>> 0) / 4294967296);
	const sacar = (arr, k) => { const c = [...arr]; const o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(azar() * c.length), 1)[0]); return o; };
	const patrones = TEMAS.flatMap((t) => t.patrones);
	const conTermino = (t) => { const x = t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(); return patrones.some((p) => p.test(x)); };
	const positivos = [...v5.values()];
	const negativos = evaluados.filter((e) => !v5.has(e.boletin) && Number(e.anio) >= 2018);
	const negConTermino = negativos.filter((e) => conTermino(e.titulo));
	const negComunes = negativos.filter((e) => !conTermino(e.titulo));
	const muestra = [
		...sacar(positivos.filter((r) => Number(r.anio) >= 2018), Math.round(n / 2)).map((r) => ({ boletin: r.boletin, v5: 'incluye', senal: r.nivel_senal })),
		...sacar(negConTermino, Math.round(n / 4)).map((r) => ({ boletin: r.boletin, v5: 'excluye', senal: 'excluido con término en el título' })),
		...sacar(negComunes, Math.round(n / 4)).map((r) => ({ boletin: r.boletin, v5: 'excluye', senal: 'excluido común' }))
	];
	console.log(`Muestra de ${muestra.length} proyectos desde 2018 (la lista v5 incluye ${positivos.length}; excluidos con término en el título: ${negConTermino.length}).`);
	const datos = new Map((await obtenerProyectos(muestra.map((m) => m.boletin))).map((p) => [p.boletin, p]));
	let k = 0;
	const res = await enParalelo(muestra.filter((m) => datos.has(m.boletin)), async (m) => {
		try {
			const r = await clasificarUno(datos.get(m.boletin), { esperarTexto: false });
			console.log(`[${++k}] ${m.boletin} v5=${m.v5} agente=${r.incluye ? 'incluye' : 'excluye'} (${r.confianza})`);
			return { ...m, agente: r.incluye ? 'incluye' : 'excluye', grupo: r.grupo, confianza: r.confianza, motivo: r.motivo, titulo: datos.get(m.boletin).titulo, apariciones: r.apariciones, densidad: r.densidad, sin_texto: r.sin_texto };
		} catch (e) { console.error(`${m.boletin} FALLÓ: ${e.message}`); return null; }
	});
	const r = res.filter(Boolean);
	mkdirSync(salida, { recursive: true });
	writeFileSync(join(salida, 'validacion.json'), JSON.stringify(r, null, 1));
	const c = (v, a) => r.filter((x) => x.v5 === v && x.agente === a).length;
	console.log(`\nMatriz (filas v5, columnas agente):\n  v5 incluye: agente incluye ${c('incluye', 'incluye')}, excluye ${c('incluye', 'excluye')}\n  v5 excluye: agente incluye ${c('excluye', 'incluye')}, excluye ${c('excluye', 'excluye')}`);
	console.log(`Coincidencia: ${(((c('incluye', 'incluye') + c('excluye', 'excluye')) / r.length) * 100).toFixed(0)} % de ${r.length}.`);
	for (const x of r.filter((y) => y.v5 !== y.agente)) console.log(`\nDIFIERE ${x.boletin} v5=${x.v5} (${x.senal}) agente=${x.agente}/${x.grupo}/${x.confianza} [${x.apariciones ?? `sin texto: ${x.sin_texto}`} ap.]\n  ${x.titulo.slice(0, 140)}\n  ${x.motivo}`);
}

/** Segunda opinión del agente sobre los proyectos que incluyó la lista v5. No cambia la selección: guarda en revision_v5. */
async function revisarV5() {
	const maximo = Number(opcion('max', 1e9));
	const lote = 30;
	// Varios agentes pueden correr a la vez: cada uno reclama una tanda en la base y nadie más la toma mientras el reclamo no expire.
	const reclamar = (n) => `
WITH candidatos AS (
  SELECT c.boletin FROM clasificacion_genero c
  WHERE c.incluye AND c.codificador IN ('regla', 'claude')
    AND NOT EXISTS (SELECT 1 FROM revision_v5 r WHERE r.boletin = c.boletin AND r.version = '${version}')
    AND NOT EXISTS (SELECT 1 FROM revision_v5_reclamo k WHERE k.boletin = c.boletin AND k.reclamado > now() - interval '30 minutes')
  ORDER BY EXISTS (SELECT 1 FROM revision_v5 r WHERE r.boletin = c.boletin), md5(c.boletin)
  LIMIT ${n}
  FOR UPDATE OF c SKIP LOCKED)
INSERT INTO revision_v5_reclamo (boletin, revisor, reclamado)
SELECT boletin, '${revisor}', now() FROM candidatos
ON CONFLICT (boletin) DO UPDATE SET revisor = EXCLUDED.revisor, reclamado = now()
  WHERE revision_v5_reclamo.reclamado < now() - interval '30 minutes'
RETURNING boletin;`;
	const liberar = () => psql(`
DELETE FROM revision_v5_reclamo k WHERE k.revisor = '${revisor}'
  AND NOT EXISTS (SELECT 1 FROM revision_v5 r WHERE r.boletin = k.boletin AND r.version = '${version}');`);
	const [{ total, hechas }] = leerCsv(await psql(`
SELECT (SELECT count(*) FROM clasificacion_genero WHERE incluye AND codificador IN ('regla', 'claude')) AS total,
       (SELECT count(*) FROM revision_v5 WHERE version = '${version}') AS hechas;`));
	console.log(`[${revisor}] Revisión de la lista v5 con el criterio ${version} y ${modelo}: ${hechas} de ${total} ya revisadas.`);
	let hechos = 0;
	let fallos = 0;
	try {
		while (hechos < maximo && !limiteAlcanzado) {
			const reclamados = leerCsv(await psql(reclamar(Math.min(lote, maximo - hechos))));
			if (reclamados.length === 0) {
				console.log(`[${revisor}] No quedan proyectos por reclamar.`);
				break;
			}
			const datos = await obtenerProyectos(reclamados.map((t) => t.boletin));
			const res = await enParalelo(datos, async (p) => {
				try {
					return await clasificarUno(p, { esperarTexto: false });
				} catch (e) {
					console.error(`[${revisor}] ${p.boletin} FALLÓ: ${e.message}`);
					fallos++;
					return null;
				}
			});
			const ok = res.filter(Boolean);
			if (ok.length) {
				const filas = ok.map((r) => fila([r.boletin, version, r.incluye, r.grupo, r.confianza, r.motivo, r.sin_texto, r.apariciones, r.densidad === null ? '' : r.densidad.toFixed(1), revisor, modelo]));
				await psql(`
CREATE TEMP TABLE rev (boletin text, version text, incluye boolean, grupo text, confianza text, motivo text, sin_texto text, apariciones int, densidad numeric, revisor text, modelo text);
\\copy rev FROM STDIN WITH (FORMAT csv)
${filas.join('\n')}
\\.
INSERT INTO revision_v5 (boletin, version, incluye, grupo, confianza, motivo, sin_texto, apariciones, densidad, revisor, modelo)
SELECT boletin, version, incluye, grupo, confianza, motivo, sin_texto, apariciones, densidad, revisor, modelo FROM rev
ON CONFLICT (boletin) DO UPDATE SET version = EXCLUDED.version, incluye = EXCLUDED.incluye, grupo = EXCLUDED.grupo, confianza = EXCLUDED.confianza,
  motivo = EXCLUDED.motivo, sin_texto = EXCLUDED.sin_texto, apariciones = EXCLUDED.apariciones, densidad = EXCLUDED.densidad,
  revisor = EXCLUDED.revisor, modelo = EXCLUDED.modelo, revisado = now();`);
			}
			hechos += ok.length;
			console.log(`[${revisor}] ${hechos} revisados en esta corrida; ${ok.filter((r) => !r.incluye).length} de la última tanda salen según el agente. Fallos: ${fallos}.`);
		}
	} finally {
		// Lo que quedó reclamado sin revisar (por ejemplo, al agotarse el límite) vuelve a estar disponible para el otro agente.
		await liberar().catch(() => {});
	}
	if (limiteAlcanzado) console.error(`[${revisor}] Se detuvo la revisión porque se agotó el límite de uso. Lo hecho quedó guardado; se reanuda al volver a ejecutarla.`);
	if (limiteAlcanzado) process.exitCode = CODIGO_LIMITE;
	else if (fallos) process.exitCode = 1;
}

/** Prueba al agente contra casos de control con una respuesta esperada (casos-control.json). No escribe en la base. */
async function probar() {
	const casos = JSON.parse(readFileSync(opcion('casos', join(aqui, 'casos-control.json')), 'utf8'));
	const boletines = Object.keys(casos);
	console.log(`Prueba con ${boletines.length} casos de control. Agente ${modelo}, criterio ${version}.`);
	const datos = new Map((await obtenerProyectos(boletines)).map((p) => [p.boletin, p]));
	let n = 0;
	const res = await enParalelo(boletines.filter((b) => datos.has(b)), async (b) => {
		try {
			const r = await clasificarUno(datos.get(b), { esperarTexto: false });
			console.log(`[${++n}/${boletines.length}] ${b} ${r.incluye ? 'incluye' : 'excluye'} (${r.confianza})`);
			return { boletin: b, titulo: datos.get(b).titulo, agente: r.incluye ? 'incluye' : 'excluye', grupoAgente: r.grupo, confianza: r.confianza, motivo: r.motivo, ...casos[b] };
		} catch (e) {
			console.error(`${b} FALLÓ: ${e.message}`);
			return null;
		}
	});
	const r = res.filter(Boolean);
	const con = r.filter((x) => x.esperado);
	const bien = con.filter((x) => x.agente === x.esperado);
	const gruposMal = con.filter((x) => x.agente === x.esperado && x.grupo && x.grupoAgente !== x.grupo);
	console.log(`\nAciertos: ${bien.length} de ${con.length} con respuesta esperada (${r.length - con.length} sin decisión). Nivel distinto del esperado en ${gruposMal.length}.`);
	for (const x of gruposMal) console.log(`  nivel ${x.boletin}: esperado ${x.grupo}, agente ${x.grupoAgente}`);
	// Si acierta menos del umbral, el criterio no sirve: se avisa con un código de salida distinto.
	if (con.length && bien.length / con.length < Number(process.env.UMBRAL_CONTROL || 0.9)) process.exitCode = 3;
	if (limiteAlcanzado) process.exitCode = CODIGO_LIMITE;
	for (const x of con.filter((y) => y.agente !== y.esperado)) console.log(`\nNO COINCIDE ${x.boletin} esperado=${x.esperado} agente=${x.agente} (${x.confianza})\n  ${x.titulo.slice(0, 140)}\n  ${x.motivo}`);
	console.log('\nSin decisión del desarrollador (solo informativo):');
	for (const x of r.filter((y) => !y.esperado)) console.log(`  ${x.boletin} agente=${x.agente} (${x.confianza}) ${x.titulo.slice(0, 80)}`);
}


/** Los proyectos de la lista v5 que el agente mantiene en la selección reciben su nivel de relación con el género. No cambia quién entra ni quién sale. */
async function aplicarNiveles() {
	const salidaSql = await psql(`
WITH a AS (
  UPDATE clasificacion_genero c SET grupo = r.grupo
  FROM revision_v5 r
  WHERE r.boletin = c.boletin AND r.version = '${version}' AND r.incluye AND c.incluye AND c.codificador IN ('regla', 'claude')
    AND c.grupo IS DISTINCT FROM r.grupo
  RETURNING 1)
SELECT count(*) AS actualizados FROM a;`);
	const [{ actualizados }] = leerCsv(salidaSql);
	console.log(`Niveles asignados a proyectos de la lista original: ${actualizados}.`);
	return Number(actualizados);
}

/** Avance de la pasada de revisión sobre la lista v5 con la versión actual del criterio. */
async function progreso() {
	const [r] = leerCsv(await psql(`
SELECT (SELECT count(*) FROM clasificacion_genero WHERE incluye AND codificador IN ('regla', 'claude')) AS total,
       (SELECT count(*) FROM revision_v5 WHERE version = '${version}') AS hechas,
       (SELECT count(*) FROM revision_v5 WHERE version = '${version}' AND NOT incluye) AS salen,
       (SELECT count(*) FROM revision_v5 WHERE version = '${version}' AND NOT incluye AND confianza = 'alta') AS salen_alta;`));
	console.log(`Revisión de la lista v5 con el criterio ${version}: ${r.hechas} de ${r.total}. El agente sacaría ${r.salen} (${r.salen_alta} con confianza alta).`);
}

/** Segunda opinión: este agente (REVISOR) revisa casos que revisó el otro. No escribe en la base; deja un JSON en la carpeta de salida. */
async function cruzarV5() {
	const n = Number(opcion('n', 40));
	const casos = leerCsv(await psql(sqlCruce(version, revisor, n)));
	const proyectos = await obtenerProyectos(casos.map((c) => c.boletin));
	const porBoletin = new Map(proyectos.map((p) => [p.boletin, p]));
	console.log(`[${revisor}] Segunda opinión sobre ${casos.length} proyectos revisados por el otro agente. Criterio ${version}, modelo ${modelo}.`);
	let hechos = 0;
	const resultados = await enParalelo(casos, async (c) => {
		try {
			const r = await clasificarUno(porBoletin.get(c.boletin), { esperarTexto: false });
			hechos++;
			if (hechos % 10 === 0) console.log(`[${revisor}] ${hechos} de ${casos.length}`);
			return {
				boletin: c.boletin, titulo: porBoletin.get(c.boletin).titulo, senal: c.senal,
				original: { revisor: c.revisor_original, incluye: c.incluye === 't', grupo: c.grupo, confianza: c.confianza, motivo: c.motivo, sin_texto: c.sin_texto || null },
				segundo: { revisor, incluye: r.incluye, grupo: r.grupo, confianza: r.confianza, motivo: r.motivo, sin_texto: r.sin_texto }
			};
		} catch (e) {
			console.error(`[${revisor}] ${c.boletin} FALLÓ: ${e.message}`);
			return null;
		}
	});
	const ok = resultados.filter(Boolean);
	mkdirSync(salida, { recursive: true });
	const archivo = opcion('archivo', join(salida, `cruce-${revisor}.json`));
	writeFileSync(archivo, JSON.stringify(ok, null, 1));
	const iguales = ok.filter((f) => f.original.incluye === f.segundo.incluye).length;
	console.log(`[${revisor}] ${ok.length} de ${casos.length} con segunda opinión; coinciden en la decisión ${iguales}. Guardado en ${archivo}.`);
	if (limiteAlcanzado) {
		console.error(`[${revisor}] Se agotó el límite de uso: quedaron ${casos.length - ok.length} sin revisar.`);
		process.exitCode = CODIGO_LIMITE;
	}
}

/** Junta los JSON de las segundas opiniones en un informe de acuerdos y desacuerdos. */
function informeCruce() {
	const filas = ['claude', 'codex'].flatMap((r) => {
		try { return JSON.parse(readFileSync(join(salida, `cruce-${r}.json`), 'utf8')); } catch { return []; }
	});
	if (!filas.length) throw new Error(`No hay resultados de cruce en ${salida}.`);
	const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
	const md = informeCruceMarkdown({ version, fecha, filas });
	const archivo = opcion('archivo', null);
	if (archivo) (writeFileSync(archivo, md), console.log(`Informe guardado en ${archivo}.`));
	else console.log(md);
}

/** Aplica la revisión del agente a la selección: saca las inclusiones de la v5 que el agente sacó, salvo las decisiones manuales. */
async function aplicarV5() {
	const manuales = JSON.parse(readFileSync(join(aqui, 'decisiones-desarrollador.json'), 'utf8'));
	const [r] = leerCsv(await psql(sqlConteoAplicarV5(version, manuales.map((m) => m.boletin))));
	console.log(`Criterio ${version}. Se retirarían ${r.a_sacar} proyectos de la selección (hoy hay ${r.incluidos} incluidos; quedarían ${Number(r.incluidos) - Number(r.a_sacar)}). Decisiones manuales que se registran: ${manuales.length}.`);
	if (!args.includes('--aplicar')) return console.log(`Ensayo: no se cambió nada. Para aplicar: aplicar-v5 --aplicar --esperadas ${r.a_sacar}`);
	if (Number(opcion('esperadas', NaN)) !== Number(r.a_sacar)) throw new Error(`Falta --esperadas ${r.a_sacar} (la cantidad que acaba de calcularse); no se aplica nada.`);
	console.log(await psql(sqlAplicarV5({ version, esperadas: Number(r.a_sacar), manuales })));
	console.log('Publicando la base del sitio...');
	await ssh('sudo /opt/observatorio/trabajo.sh publicar');
	console.log('Aplicado y publicado.');
}

async function informeV5() {
	const filas = leerCsv(await psql(SQL_INFORME_V5));
	const ejemplos = leerCsv(await psql(SQL_EJEMPLOS_V5));
	const versiones = leerCsv(await psql(SQL_VERSIONES_V5));
	const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
	const md = informeV5Markdown({ version, fecha, filas, ejemplos, versiones });
	const archivo = opcion('archivo', null);
	if (archivo) (writeFileSync(archivo, md), console.log(`Informe guardado en ${archivo}.`));
	else console.log(md);
}

try {
	if (orden === 'progreso') await progreso();
	else if (orden === 'informe-v5') await informeV5();
	else if (orden === 'cruzar-v5') await cruzarV5();
	else if (orden === 'aplicar-v5') await aplicarV5();
	else if (orden === 'informe-cruce') informeCruce();
	else if (orden === 'version') console.log(version);
	else if (orden === 'aplicar-niveles') await aplicarNiveles();
	else if (orden === 'probar') await probar();
	else if (orden === 'revisar-v5') await revisarV5();
	else if (orden === 'pendientes') await pendientes();
	else if (orden === 'validar') await validar();
	else if (orden === 'sembrar') await sembrar();
	else (console.error('Uso: clasificar.mjs pendientes [--max N] [--simulacro] [--reclasificar] | validar [--n 60] | sembrar | revisar-v5 [--max 450] | probar [--casos ruta] | informe-v5 [--archivo ruta]'), (process.exitCode = 2));
} catch (e) {
	console.error(`Error: ${e.message}`);
	process.exitCode = 1;
}
