import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Ficha } from './ficha';
import { ProyectoDetalle } from './proyectos.service';

const mocion: ProyectoDetalle = {
  boletin: '17348-37',
  titulo: 'Declara el 8 de diciembre de cada año como el "Día Nacional para la Conmemoración de las Víctimas del Incendio de La Compañía"',
  fechaIngreso: '2025-01-14',
  tipoIniciativa: 'Moción',
  camaraOrigen: 'Senado',
  admisible: true,
  autores: [
    { nombre: 'Isabel', apellidoPaterno: 'Allende', apellidoMaterno: 'Bussi', camara: 'Senado' },
    { nombre: 'Yasna', apellidoPaterno: 'Provoste', apellidoMaterno: null, camara: 'Senado' },
  ],
  fuente: 'camara',
  idOrigen: '17985',
  fechaConsulta: '2026-10-12T15:00:00Z',
};

describe('Ficha', () => {
  let fixture: ComponentFixture<Ficha>;
  let http: HttpTestingController;
  let html: HTMLElement;

  async function abrir(boletin: string, respuesta: ProyectoDetalle | number) {
    fixture.componentRef.setInput('boletin', boletin);
    fixture.detectChanges();
    const req = http.expectOne(`/api/proyectos/${boletin}`);
    if (typeof respuesta === 'number') req.flush('', { status: respuesta, statusText: 'x' });
    else req.flush(respuesta);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ficha],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Ficha);
    html = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('muestra el proyecto con sus autores y su procedencia', async () => {
    await abrir('17348-37', mocion);

    expect(html.querySelector('h1')?.textContent).toContain('Día Nacional');
    expect(html.textContent).toContain('14-01-2025');
    const autores = [...html.querySelectorAll('.autores li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(autores).toEqual(['Isabel Allende Bussi Senado', 'Yasna Provoste Senado']);
    expect(html.querySelector('.procedencia')?.textContent).toContain('identificador 17985');
  });

  it('explica que un mensaje no tiene autores parlamentarios', async () => {
    await abrir('17641-13', { ...mocion, boletin: '17641-13', tipoIniciativa: 'Mensaje', autores: [] });

    expect(html.querySelector('.autores')).toBeNull();
    expect(html.textContent).toContain('mensaje del Ejecutivo');
  });

  it('dice claramente cuando el boletín no existe', async () => {
    await abrir('99999-99', 404);

    expect(html.querySelector('[role="alert"] h1')?.textContent).toContain('Proyecto no encontrado');
    expect(html.textContent).toContain('99999-99');
  });

  it('distingue un error del servicio de un proyecto inexistente', async () => {
    await abrir('17348-37', 503);

    expect(html.textContent).toContain('No fue posible obtener el proyecto');
    expect(html.textContent).not.toContain('no encontrado');
  });

  it('pide el boletín codificado en la URL', async () => {
    fixture.componentRef.setInput('boletin', 'a/b');
    fixture.detectChanges();
    http.expectOne('/api/proyectos/a%2Fb').flush(mocion);
  });

  it('ofrece volver a la lista', () => {
    fixture.componentRef.setInput('boletin', '17348-37');
    fixture.detectChanges();
    http.expectOne('/api/proyectos/17348-37').flush(mocion);
    expect(html.querySelector('.volver a')?.getAttribute('href')).toBe('/');
  });
});
