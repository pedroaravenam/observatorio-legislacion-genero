import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ProyectoDetalle, ProyectosService } from './proyectos.service';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'no-encontrado' }
  | { tipo: 'error' }
  | { tipo: 'listo'; proyecto: ProyectoDetalle };

/** Ficha de un proyecto de ley. El boletín llega desde la ruta /proyectos/:boletin. */
@Component({
  selector: 'app-ficha',
  imports: [DatePipe, RouterLink],
  templateUrl: './ficha.html',
  styleUrl: './ficha.css',
})
export class Ficha {
  private readonly servicio = inject(ProyectosService);

  readonly boletin = input.required<string>();

  protected readonly estado = toSignal(
    toObservable(this.boletin).pipe(
      switchMap((b) =>
        this.servicio.detalle(b).pipe(
          map((proyecto): Estado => ({ tipo: 'listo', proyecto })),
          catchError((e: unknown) =>
            of<Estado>(e instanceof HttpErrorResponse && e.status === 404 ? { tipo: 'no-encontrado' } : { tipo: 'error' }),
          ),
          startWith<Estado>({ tipo: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { tipo: 'cargando' } as Estado },
  );

  protected nombreCompleto(a: ProyectoDetalle['autores'][number]): string {
    return [a.nombre, a.apellidoPaterno, a.apellidoMaterno].filter(Boolean).join(' ');
  }
}
