import { describe, expect, it } from 'vitest';
import {
	consultaBusqueda,
	esBoletin,
	fechaCorta,
	pasoTramitacion,
	fechaLarga,
	numeroLey,
	urlFichaSenado
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
