import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { Criterios, Filtros, Pagina, Proyecto, ProyectosService } from './proyectos.service';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; pagina: Pagina<Proyecto> };

const TAMANO = 20;

@Component({
  selector: 'app-proyectos',
  imports: [DatePipe, RouterLink],
  templateUrl: './proyectos.html',
  styleUrl: './proyectos.css',
})
export class Proyectos {
  private readonly servicio = inject(ProyectosService);

  protected readonly criterios = signal<Criterios>({ texto: '', tipo: null, camara: null, anno: null, pagina: 1 });

  protected readonly filtros = toSignal(
    this.servicio.filtros().pipe(catchError(() => of<Filtros>({ tiposIniciativa: [], camaras: [], annos: [] }))),
  );

  protected readonly estado = toSignal(
    toObservable(this.criterios).pipe(
      debounceTime(250),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap((c) =>
        this.servicio.buscar(c, TAMANO).pipe(
          map((pagina): Estado => ({ tipo: 'listo', pagina })),
          catchError(() => of<Estado>({ tipo: 'error' })),
          startWith<Estado>({ tipo: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { tipo: 'cargando' } as Estado },
  );

  protected readonly totalPaginas = computed(() => {
    const e = this.estado();
    return e.tipo === 'listo' ? Math.max(1, Math.ceil(e.pagina.total / TAMANO)) : 1;
  });

  protected cambiar(parcial: Partial<Criterios>): void {
    this.criterios.update((c) => ({ ...c, pagina: 1, ...parcial }));
  }

  protected numeroONulo(valor: string): number | null {
    return valor === '' ? null : Number(valor);
  }

  protected irA(pagina: number): void {
    this.criterios.update((c) => ({ ...c, pagina }));
  }

  protected reintentar(): void {
    this.criterios.update((c) => ({ ...c }));
  }
}
