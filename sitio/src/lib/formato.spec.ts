import { describe, expect, it } from 'vitest';
import {
	aCsv,
	etiquetaSenal,
	nivelRelacion,
	celdaCsv,
	ordenPorDefecto,
	parametrosFiltros,
	consultaBusqueda,
	esBoletin,
	fechaCorta,
	pasoTramitacion,
	fechaLarga,
	numeroLey,
	urlFichaSenado,
	textoAutoria
} from './formato';

describe('fechas', () => {
	it('formatea fechas válidas y rechaza las inválidas', () => {
		expect(fechaLarga('2015-04-21')).toBe('21 de abril de 2015');
		expect(fechaCorta('2015-04-21')).toBe('21-04-2015');
		expect(fechaLarga('2015-13-01')).toBeNull();
		expect(fechaLarga(null)).toBeNull();
	});
});

describe('numeroLey', () => {
	it('lee las dos grafías del Senado y descarta decretos', () => {
		expect(numeroLey('Ley N° 20.870')).toBe(20870);
		expect(numeroLey('Ley Nº 19.379')).toBe(19379);
		expect(numeroLey('D.S N° 84')).toBeNull();
		expect(numeroLey(null)).toBeNull();
	});
});

describe('consultaBusqueda', () => {
	it('convierte palabras en prefijos y neutraliza la sintaxis de FTS5', () => {
		expect(consultaBusqueda('Violencia  contra la mujer')).toBe(
			'"violencia"* "contra"* "la"* "mujer"*'
		);
		expect(consultaBusqueda('mujer" OR NEAR(')).toBe('"mujer"* "or"* "near"*');
		expect(consultaBusqueda('a ? !')).toBeNull();
	});
});

describe('boletín y enlaces', () => {
	it('valida el formato del boletín y arma la URL del Senado', () => {
		expect(esBoletin('11077-07')).toBe(true);
		expect(esBoletin('11077')).toBe(false);
		expect(esBoletin("1'; drop")).toBe(false);
		expect(urlFichaSenado('11077-07')).toContain('boletin_ini=11077-07');
	});
});

describe('pasoTramitacion', () => {
	it('ubica la etapa del Senado en el proceso legislativo', () => {
		expect(pasoTramitacion('Publicado', 'Tramitación terminada')).toBe(4);
		expect(pasoTramitacion('En tramitación', 'Primer trámite constitucional (Senado)')).toBe(0);
		expect(pasoTramitacion('En tramitación', 'Segundo trámite constitucional (C.Diputados)')).toBe(
			1
		);
		expect(
			pasoTramitacion('En tramitación', 'Comisión Mixta por rechazo de modificaciones (Senado)')
		).toBe(2);
		expect(pasoTramitacion('En tramitación', 'Discusión veto en Cámara Revisora (Senado)')).toBe(3);
		expect(pasoTramitacion('Archivado', 'Archivado')).toBeNull();
	});
});

describe('CSV', () => {
	it('entrecomilla lo que trae coma, comillas o salto de línea', () => {
		expect(celdaCsv('a,b')).toBe('"a,b"');
		expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
		expect(celdaCsv('uno\ndos')).toBe('"uno\ndos"');
		expect(celdaCsv(null)).toBe('');
		expect(celdaCsv(0)).toBe('0');
	});
	it('arma encabezado y filas con BOM y CRLF', () => {
		const t = aCsv([{ a: 'x', b: 'y,z' }], ['a', 'b']);
		expect(t).toBe('﻿a,b\r\nx,"y,z"\r\n');
	});
});

describe('textoAutoria', () => {
	it('describe cada autoría y calla lo que no se sabe', () => {
		expect(textoAutoria('mujeres')).toBe('firmado solo por mujeres');
		expect(textoAutoria('mixta')).toBe('firmado por mujeres y hombres');
		expect(textoAutoria('ejecutivo')).toBe('presentado por la Presidencia de la República');
		expect(textoAutoria('sin_dato')).toBeNull();
		expect(textoAutoria(undefined)).toBeNull();
	});
});

describe('parametrosFiltros', () => {
	const base = {
		texto: '',
		anno: null,
		estado: null,
		iniciativa: null,
		tema: null,
		camara: null,
		autor: null,
		autoria: null,
		orden: 'recientes' as const,
		pagina: 1
	};
	it('no escribe valores por defecto', () => {
		expect(parametrosFiltros(base).toString()).toBe('');
	});
	it('escribe el orden solo si difiere del que corresponde', () => {
		expect(ordenPorDefecto('sala cuna')).toBe('pertinencia');
		expect(
			parametrosFiltros({ ...base, texto: 'sala cuna', orden: 'pertinencia' }).toString()
		).toBe('q=sala+cuna');
		expect(parametrosFiltros({ ...base, orden: 'antiguos' }).get('orden')).toBe('antiguos');
	});
	it('arrastra autor, autoría y cámara, y cambia de página', () => {
		const p = parametrosFiltros(
			{ ...base, autor: 'Pérez Ana', autoria: 'mujeres', camara: 'Senado', pagina: 2 },
			{ pagina: 3 }
		);
		expect(p.get('autor')).toBe('Pérez Ana');
		expect(p.get('autoria')).toBe('mujeres');
		expect(p.get('camara')).toBe('Senado');
		expect(p.get('pagina')).toBe('3');
	});
});

describe('etiquetaSenal', () => {
	it('explica las señales del agente y avisa de que lo leyó un agente', () => {
		expect(etiquetaSenal('A1_agente_tema_central')).toMatch(/agente.*tema central/);
		expect(etiquetaSenal('A2_agente_componente')).toMatch(/agente.*una parte/);
	});
	it('tiene un texto por defecto para señales desconocidas', () => {
		expect(etiquetaSenal('X_nueva')).toMatch(/criterio de selección/);
	});
});

describe('nivelRelacion', () => {
	it('traduce el grupo del criterio al nivel que muestra el sitio', () => {
		expect(nivelRelacion('tema_central')?.nombre).toBe('alta');
		expect(nivelRelacion('componente')?.nombre).toBe('media');
		expect(nivelRelacion('debil')?.nombre).toBe('débil');
		expect(nivelRelacion('debil')?.clave).toBe('debil');
	});
	it('devuelve null si aún no hay nivel (proyectos de la lista original)', () => {
		expect(nivelRelacion(null)).toBeNull();
		expect(nivelRelacion(undefined)).toBeNull();
		expect(nivelRelacion('otro')).toBeNull();
	});
	it('tiene etiqueta para el nivel débil y la decisión manual', () => {
		expect(etiquetaSenal('A3_agente_debil')).toMatch(/duda razonable/);
		expect(etiquetaSenal('M_decision_manual')).toMatch(/equipo del Observatorio/);
	});
});
