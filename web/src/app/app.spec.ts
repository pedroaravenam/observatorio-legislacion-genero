import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes, withComponentInputBinding())],
    }).compileComponents();
  });

  it('muestra el nombre del sitio con un enlace al inicio', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const enlace = (fixture.nativeElement as HTMLElement).querySelector('.sitio');
    expect(enlace?.textContent).toContain('Observatorio de Legislación de Género');
    expect(enlace?.getAttribute('href')).toBe('/');
  });

  it('la ruta de un proyecto abre su ficha con el boletín de la URL', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/proyectos/17353-07');
    TestBed.inject(HttpTestingController).expectOne('/api/proyectos/17353-07');
    expect(harness.routeNativeElement?.textContent).toContain('Cargando el proyecto 17353-07');
  });
});
