// Datos del proyecto que se muestran en el sitio: autoría, contacto y canales de aporte.

export const CONTACTO = 'contacto@legislaciongenero.cl';
export const REPOSITORIO = 'https://github.com/pedroaravenam/observatorio-legislacion-genero';

export const AUTOR = {
	nombre: 'Pedro Aravena Medel',
	presentacion:
		'Soy Pedro Aravena Medel, sociólogo de la Universidad de Concepción y magíster en Desarrollo Humano por FLACSO Argentina. Creé el Observatorio de Legislación de Género para facilitar el seguimiento de las iniciativas de género en el Congreso de Chile y poner esa información al alcance de cualquier persona.',
	/** Reseña breve de quien desarrolla el sitio. Mientras esté vacía, no se muestra. */
	resena:
		'He trabajado en instituciones públicas y privadas, en los ámbitos local y central, y me he especializado en análisis de datos, análisis espacial, diseño muestral y uso de herramientas de inteligencia artificial. Este sitio nace de combinar esa experiencia con un tema que me importa: que seguir la legislación de género sea más sencillo y no requiera revisar boletín por boletín.',
	/** Foto del autor, en `sitio/static/`. Mientras esté vacía, no se muestra. */
	foto: '/pedro-aravena-medel.webp',
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
		url: 'https://link.mercadopago.cl/legislaciongenero'
	},
	{
		clave: 'kofi',
		nombre: 'Ko-fi',
		detalle: 'Aporte único con tarjeta, en dólares, sin crear una cuenta.',
		url: 'https://ko-fi.com/legislaciongenero'
	}
];

/** Canales que ya tienen dirección y se pueden mostrar. */
export function aportesDisponibles(canales: CanalAporte[] = APORTES): CanalAporte[] {
	return canales.filter((c) => /^https:\/\//.test(c.url));
}
