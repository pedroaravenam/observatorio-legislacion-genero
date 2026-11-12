// Datos del proyecto que se muestran en el sitio: autoría, contacto y canales de aporte.

export const CONTACTO = 'contacto@legislaciongenero.cl';
export const REPOSITORIO = 'https://github.com/pedroaravenam/observatorio-legislacion-genero';

export const AUTOR = {
	nombre: 'Pedro Aravena',
	/** Reseña breve de quien desarrolla el sitio. Mientras esté vacía, no se muestra. */
	resena: ''
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
