// Temas del Observatorio. Cada tema reúne términos del léxico de género; un proyecto puede tener varios.
// Los patrones se aplican sobre el título en minúsculas y sin tildes (ver `normalizar`).

export interface Tema {
	clave: string;
	nombre: string;
	descripcion: string;
	patrones: RegExp[];
}

export const TEMAS: Tema[] = [
	{
		clave: 'violencia',
		nombre: 'Violencia de género',
		descripcion: 'Violencia contra las mujeres, intrafamiliar y sexual, femicidio, acoso y trata.',
		patrones: [
			/violencia (contra|hacia|en contra de) (la|las) mujer(es)?|violencia de genero|violencia machista/,
			/violencia (intrafamiliar|domestica|familiar|en la pareja|contra la pareja)|maltrato (habitual|intrafamiliar)/,
			/\bfemicidios?\b|\bfeminicidios?\b|parricidio/,
			/acoso sexual|hostigamiento sexual|acoso callejero|acoso laboral/,
			/delitos? sexuales?|abusos? sexuales?|violacion(es)?|estupro|agresion(es)? sexuales?|incesto/,
			/libre de violencia|violencia sexual|violencia politica/
		]
	},
	{
		clave: 'familia',
		nombre: 'Maternidad y familia',
		descripcion:
			'Embarazo, maternidad, lactancia, pensión de alimentos, matrimonio, divorcio y unión civil.',
		patrones: [
			/\bmaternidad\b|\bmaternal(es)?\b|\bmadres?\b|\bmaterno\b|post ?natal|pre ?natal|lactancia|lactante/,
			/\bembaraz\w+|\bgestante\w*|\bparto\b/,
			/pensiones? alimenticias?|pension de alimentos|deudor\w* de (pension|alimentos)|abandono de familia|juicios? de alimentos/,
			/\bmatrimonio\b|\bdivorcio\b|\bconyuge\w*|regimen patrimonial|sociedad conyugal|union civil|convivientes?/
		]
	},
	{
		clave: 'trabajo',
		nombre: 'Trabajo y cuidados',
		descripcion:
			'Trabajadoras, sala cuna, brecha salarial, trabajo doméstico y de cuidados, corresponsabilidad.',
		patrones: [
			/sala cuna|salas cunas?/,
			/\btrabajadoras?\b|\btemporeras?\b|duenas? de casa|casa particular/,
			/igualdad (de |en |de las |en las )?(remuneraci|salari)\w*|brecha salarial|igual remuneracion/,
			/\bcuidadoras?\b|\bcuidados?\b|corresponsabilidad/,
			/trabajo domestico|labores domesticas|trabajo no remunerado/
		]
	},
	{
		clave: 'salud',
		nombre: 'Salud sexual y reproductiva',
		descripcion:
			'Aborto, anticoncepción, educación sexual, VIH, salud de la mujer y reproducción asistida.',
		patrones: [
			/derechos? (sexuales?|reproductivos?)|salud (sexual|reproductiva)|educacion sexual|planificacion familiar|anticoncepci\w+|anticonceptiv\w+|pildora/,
			/\baborto\w*|interrupcion (voluntaria )?del embarazo|tres causales/,
			/\bvih\b|\bsida\b|(enfermedades?|infecciones?) de transmision sexual/,
			/cancer (de mama|cervico|de cuello|uterino)|\bmamograf\w+|cuello uterino|ginecolog\w+|obstetric\w+|\bmatron\w*|esterilizacion|reproduccion (humana )?asistida|fertilizacion/
		]
	},
	{
		clave: 'paridad',
		nombre: 'Participación y paridad',
		descripcion: 'Paridad, cuotas de género, candidaturas y participación política de las mujeres.',
		patrones: [
			/\bparidad\b|paritari[oa]s?|participacion politica de las mujeres/,
			/cuotas? (de genero|para mujeres|femenina|de mujeres|de participacion)/,
			/equilibrio de genero|representacion equilibrada/
		]
	},
	{
		clave: 'diversidad',
		nombre: 'Diversidad sexual e identidad de género',
		descripcion:
			'Identidad de género, orientación sexual, personas trans y LGBTI, matrimonio igualitario.',
		patrones: [
			/identidad de genero|\btrans(genero)?\b|\btransexual\w*|cambio de sexo|rectificacion de (la )?(partida|sexo)/,
			/diversidad sexual|orientacion sexual|\blgbt\w*|homosexual\w*|homofob\w+|transfob\w+|\blesbian\w+|\bintersex\w*|igualitario|mismo sexo/
		]
	},
	{
		clave: 'igualdad',
		nombre: 'Igualdad y no discriminación',
		descripcion:
			'Igualdad entre hombres y mujeres, discriminación, institucionalidad de la mujer y menciones directas a las mujeres.',
		patrones: [
			/\bgeneros?\b(?!.{0,5}cannabis)/,
			/hombres y mujeres|mujeres y hombres|varones y mujeres|igualdad de oportunidades entre/,
			/\bmujer(es)?\b|\bfemenin[oa]s?\b/,
			/\bdiscriminacion(es)?\b|\bdiscriminatori[oa]s?\b|\bdiscriminar\b|antidiscriminacion|zamudio/,
			/servicio nacional de la mujer|sernam|ministerio de la mujer/,
			/\b(sexis(mo|ta)s?|machis(mo|ta)s?|misogin\w+)\b|\bfeminis\w+/
		]
	},
	{
		clave: 'otros',
		nombre: 'Otros temas de género',
		descripcion:
			'Prostitución y explotación sexual, lenguaje no sexista, conmemoraciones y viudez.',
		patrones: [
			/prostituc\w+|explotacion sexual|pornograf\w+|comercio sexual|trata de (personas|mujeres)/,
			/lenguaje (inclusivo|no sexista)|lenguaje de genero/,
			/dia (internacional )?de la mujer|dia de la madre|\b8 de marzo\b/,
			/\bviudas?\b|\bviudez\b/
		]
	}
];

/** Minúsculas y sin tildes ni diéresis, para comparar con los patrones. */
export function normalizar(texto: string): string {
	return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Claves de los temas cuyo léxico aparece en el título. Puede devolver ninguno. */
export function temasDe(titulo: string): string[] {
	const t = normalizar(titulo);
	return TEMAS.filter((tema) => tema.patrones.some((p) => p.test(t))).map((tema) => tema.clave);
}
