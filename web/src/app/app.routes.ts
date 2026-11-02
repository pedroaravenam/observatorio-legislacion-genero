import { Routes } from '@angular/router';
import { Ficha } from './proyectos/ficha';
import { Proyectos } from './proyectos/proyectos';

export const routes: Routes = [
  { path: '', component: Proyectos, title: 'Proyectos de ley · Observatorio de Legislación de Género' },
  { path: 'proyectos/:boletin', component: Ficha, title: 'Proyecto de ley · Observatorio de Legislación de Género' },
  { path: '**', redirectTo: '' },
];
