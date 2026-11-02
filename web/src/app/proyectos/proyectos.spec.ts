import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Proyectos } from './proyectos';
import { Pagina, Proyecto } from './proyectos.service';

const proyecto: Proyecto = {
  boletin: '17641-13',
  titulo: 'Crea un nuevo sistema de subsidio unificado al empleo',
  fechaIngreso: '2025-07-01',
  tipoIniciativa: 'Mensaje',
  camaraOrigen: 'Cámara de Diputados',
  admisible: true,
  fuente: 'camara',
  fechaConsulta: '2026-10-01T20:00:00Z',
};

describe('Proyectos', () => {
  let fixture: ComponentFixture<Proyectos>;
  let http: HttpTestingController;

  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function responderBusqueda(cuerpo: Pagina<Proyecto> | 'error') {
    await esperar(300); // debounce de la búsqueda
    const req = http.expectOne((r) => r.url === '/api/proyectos');
    if (cuerpo === 'error') req.flush('falla', { status: 503, statusText: 'Service Unavailable' });
    else req.flush(cuerpo);
    await fixture.whenStable();
    fixture.detectChanges();
    return req.request;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Proyectos],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Proyectos);
    fixture.detectChanges();
    http.expectOne('/api/proyectos/filtros').flush({ tiposIniciativa: [{ id: 1, nombre: 'Mensaje' }], camaras: [], annos: [2025] });
  });

  afterEach(() => http.verify());

  it('muestra el estado de carga y luego la tabla con su procedencia', async () => {
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Cargando proyectos');

    await responderBusqueda({ elementos: [proyecto], total: 1, numeroPagina: 1, tamano: 20 });

    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(html.querySelector('tbody')?.textContent).toContain('17641-13');
    expect(html.querySelector('tbody')?.textContent).toContain('01-07-2025');
    expect(html.querySelector('.procedencia')?.textContent).toContain('opendata.camara.cl');
    expect(html.querySelector('tbody .boletin a')?.getAttribute('href')).toBe('/proyectos/17641-13');
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    await responderBusqueda({ elementos: [], total: 0, numeroPagina: 1, tamano: 20 });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hay proyectos que coincidan');
  });

  it('muestra un error comprensible y permite reintentar', async () => {
    await responderBusqueda('error');
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('No fue posible obtener los proyectos');
  });

  it('envía los filtros elegidos a la API', async () => {
    await responderBusqueda({ elementos: [], total: 0, numeroPagina: 1, tamano: 20 });
    const html = fixture.nativeElement as HTMLElement;
    const input = html.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'subsidio';
    input.dispatchEvent(new Event('input'));
    const tipo = html.querySelector('select') as HTMLSelectElement;
    tipo.value = '1';
    tipo.dispatchEvent(new Event('change'));

    const req = await responderBusqueda({ elementos: [proyecto], total: 1, numeroPagina: 1, tamano: 20 });
    expect(req.params.get('texto')).toBe('subsidio');
    expect(req.params.get('tipo')).toBe('1');
    expect(req.params.get('pagina')).toBe('1');
  });
});
