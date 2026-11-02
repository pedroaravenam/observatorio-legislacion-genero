import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Proyecto {
  boletin: string;
  titulo: string;
  fechaIngreso: string;
  tipoIniciativa: string;
  camaraOrigen: string;
  admisible: boolean | null;
  fuente: string;
  fechaConsulta: string;
}

export interface Autor {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  camara: string;
}

export interface ProyectoDetalle {
  boletin: string;
  titulo: string;
  fechaIngreso: string;
  tipoIniciativa: string;
  camaraOrigen: string;
  admisible: boolean | null;
  autores: Autor[];
  fuente: string;
  idOrigen: string;
  fechaConsulta: string;
}

export interface Pagina<T> {
  elementos: T[];
  total: number;
  numeroPagina: number;
  tamano: number;
}

export interface OpcionFiltro {
  id: number;
  nombre: string;
}

export interface Filtros {
  tiposIniciativa: OpcionFiltro[];
  camaras: OpcionFiltro[];
  annos: number[];
}

export interface Criterios {
  texto: string;
  tipo: number | null;
  camara: number | null;
  anno: number | null;
  pagina: number;
}

@Injectable({ providedIn: 'root' })
export class ProyectosService {
  private readonly http = inject(HttpClient);

  buscar(c: Criterios, tamano = 20): Observable<Pagina<Proyecto>> {
    let params = new HttpParams().set('pagina', c.pagina).set('tamano', tamano);
    if (c.texto.trim()) params = params.set('texto', c.texto.trim());
    if (c.tipo !== null) params = params.set('tipo', c.tipo);
    if (c.camara !== null) params = params.set('camara', c.camara);
    if (c.anno !== null) params = params.set('anno', c.anno);
    return this.http.get<Pagina<Proyecto>>('/api/proyectos', { params });
  }

  detalle(boletin: string): Observable<ProyectoDetalle> {
    return this.http.get<ProyectoDetalle>(`/api/proyectos/${encodeURIComponent(boletin)}`);
  }

  filtros(): Observable<Filtros> {
    return this.http.get<Filtros>('/api/proyectos/filtros');
  }
}
