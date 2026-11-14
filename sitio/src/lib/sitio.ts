// Datos del proyecto que se muestran en el sitio: autoría, contacto y canales de aporte.

export const CONTACTO = 'contacto@legislaciongenero.cl';
export const REPOSITORIO = 'https://github.com/pedroaravenam/observatorio-legislacion-genero';

export const AUTOR = {
	nombre: 'Pedro Aravena Medel',
	/** Reseña breve de quien desarrolla el sitio. Mientras esté vacía, no se muestra. */
	resena:
		'Es sociólogo de la Universidad de Concepción y especialista en análisis de datos. Ha trabajado en diversas instituciones públicas y privadas, tanto en el ámbito local como en el central. Se formó en análisis espacial, diseño muestral y uso de herramientas de inteligencia artificial, y es magíster en Desarrollo Humano de la FLACSO. El Observatorio nace de ahí: de aplicar ese oficio a un tema que le importa, para que seguir la legislación de género no dependa de revisar boletín por boletín.',
	linkedin: 'https://www.linkedin.com/in/pedro-aravena-medel-576b682b/'
};

export interface CanalAporte {
	clave: string;
	nombre: string;
	detalle: string;
	/** Dirección del canal. Mientras esté vacía, el canal no se muestra: no se publica un botón que no lleve a ninguna parte. */
	url: string;
}

export const APORTES: CanalAporte[] = [
	{
		clave: 'mercadopago',
		nombre: 'Mercado Pago',
		detalle: 'En pesos chilenos, con tarjeta o saldo.',
		url: ''
	},
	{
		clave: 'github',
		nombre: 'GitHub Sponsors',
		detalle: 'Aporte mensual o único, en dólares.',
		url: ''
	},
	{
		clave: 'kofi',
		nombre: 'Ko-fi',
		detalle: 'Aporte único con tarjeta, en dólares, sin crear una cuenta.',
		url: ''
	}
];

/** Canales que ya tienen dirección y se pueden mostrar. */
export function aportesDisponibles(canales: CanalAporte[] = APORTES): CanalAporte[] {
	return canales.filter((c) => /^https:\/\//.test(c.url));
}
