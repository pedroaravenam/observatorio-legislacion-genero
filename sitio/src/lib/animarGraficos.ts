import { tick } from 'svelte';
import type { Action } from 'svelte/action';

const GRAFICOS = 'figure.grafico, .barras-h, .margen .barras, .autores';

/** Mejora progresiva: la geometría final y las cifras existen aun sin JavaScript. */
export const animarGraficos: Action<HTMLElement, string> = (nodo) => {
	if (
		typeof IntersectionObserver === 'undefined' ||
		typeof Element.prototype.animate !== 'function'
	)
		return;

	const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
	const animaciones = new Map<HTMLElement, Set<Animation>>();
	let vistos = new WeakSet<HTMLElement>();
	let observador: IntersectionObserver | null = null;
	let revision = 0;
	let destruido = false;

	function terminar(grafico: HTMLElement) {
		vistos.add(grafico);
		observador?.unobserve(grafico);
		animaciones.get(grafico)?.forEach((animacion) => animacion.cancel());
		animaciones.delete(grafico);
	}

	function detener() {
		observador?.disconnect();
		animaciones.forEach((grupo) => grupo.forEach((animacion) => animacion.cancel()));
		animaciones.clear();
	}

	function dibujar(grafico: HTMLElement) {
		if (vistos.has(grafico) || reducido.matches) return;
		vistos.add(grafico);
		// El foco tiene prioridad sobre la entrada, también al navegar con teclado.
		if (grafico.contains(document.activeElement) || grafico.matches(':hover')) return;
		const anual = grafico.matches('figure.grafico');
		const grupo = new Set<Animation>();
		animaciones.set(grafico, grupo);
		grafico.querySelectorAll<HTMLElement>(anual ? '.columna' : '.b-total').forEach((barra, i) => {
			barra.style.transformOrigin = anual ? 'center bottom' : 'left center';
			const animacion = barra.animate(
				[
					{ transform: anual ? 'scaleY(0)' : 'scaleX(0)' },
					{ transform: anual ? 'scaleY(1)' : 'scaleX(1)' }
				],
				{
					duration: 850,
					delay: Math.min(i * 10, 220),
					easing: 'cubic-bezier(.16,1,.3,1)',
					fill: 'backwards'
				}
			);
			grupo.add(animacion);
			const retirar = () => {
				grupo.delete(animacion);
				if (!grupo.size && animaciones.get(grafico) === grupo) animaciones.delete(grafico);
			};
			void animacion.finished.then(retirar, retirar);
		});
		if (!grupo.size) animaciones.delete(grafico);
	}

	async function observar() {
		const actual = ++revision;
		detener();
		await tick();
		if (destruido || actual !== revision || reducido.matches) return;
		observador = new IntersectionObserver(
			(entradas) => {
				for (const entrada of entradas) {
					if (!entrada.isIntersecting) continue;
					const grafico = entrada.target as HTMLElement;
					dibujar(grafico);
					observador?.unobserve(grafico);
				}
			},
			{ threshold: 0.25 }
		);
		nodo.querySelectorAll<HTMLElement>(GRAFICOS).forEach((grafico) => {
			if (!vistos.has(grafico)) observador?.observe(grafico);
		});
	}

	function alConsultar(evento: Event) {
		if (!(evento.target instanceof Element)) return;
		const grafico = evento.target.closest<HTMLElement>(GRAFICOS);
		if (grafico && nodo.contains(grafico)) terminar(grafico);
	}

	const alCambiarPreferencia = () => void observar();
	nodo.addEventListener('pointerover', alConsultar);
	nodo.addEventListener('focusin', alConsultar);
	reducido.addEventListener('change', alCambiarPreferencia);
	void observar();

	return {
		update() {
			vistos = new WeakSet();
			void observar();
		},
		destroy() {
			destruido = true;
			revision++;
			detener();
			nodo.removeEventListener('pointerover', alConsultar);
			nodo.removeEventListener('focusin', alConsultar);
			reducido.removeEventListener('change', alCambiarPreferencia);
		}
	};
};
