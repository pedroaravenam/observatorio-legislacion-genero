using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Observatorio.Api;

namespace Observatorio.Pruebas;

[Collection(ColeccionBaseDatos.Nombre)]
public class ApiPruebas : IAsyncLifetime
{
    private WebApplicationFactory<PuntoDeEntradaApi>? _fabrica;

    public async Task InitializeAsync()
    {
        if (BaseDeDatos.CadenaConexion is null) return;
        await BaseDeDatos.VaciarAsync();
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            await Ingestas.Crear(db, FuenteSimulada.ConFixtures2025(), detalle: true).EjecutarAsync(2025, CancellationToken.None);
        }
        _fabrica = new WebApplicationFactory<PuntoDeEntradaApi>().WithWebHostBuilder(b =>
            b.UseSetting("ConnectionStrings:Observatorio", BaseDeDatos.CadenaConexion));
    }

    public async Task DisposeAsync()
    {
        if (_fabrica is not null) await _fabrica.DisposeAsync();
    }

    private HttpClient Cliente() => _fabrica!.CreateClient();

    [FactConBaseDatos]
    public async Task ListaPaginadaOrdenadaPorFechaDescendente()
    {
        var pagina = await Cliente().GetFromJsonAsync<Pagina<ProyectoDto>>("/api/proyectos?tamano=5");

        Assert.NotNull(pagina);
        Assert.Equal(707, pagina.Total);
        Assert.Equal(5, pagina.Elementos.Count);
        Assert.Equal(pagina.Elementos.OrderByDescending(p => p.FechaIngreso).Select(p => p.Boletin), pagina.Elementos.Select(p => p.Boletin));
        Assert.All(pagina.Elementos, p => Assert.Equal("camara", p.Fuente));
    }

    [FactConBaseDatos]
    public async Task FiltraPorTextoSinDistinguirMayusculas()
    {
        var pagina = await Cliente().GetFromJsonAsync<Pagina<ProyectoDto>>("/api/proyectos?texto=SUBSIDIO%20UNIFICADO");

        var p = Assert.Single(pagina!.Elementos);
        Assert.Equal("17641-13", p.Boletin);
        Assert.Equal("Mensaje", p.TipoIniciativa);
        Assert.Equal("Cámara de Diputados", p.CamaraOrigen);
    }

    [FactConBaseDatos]
    public async Task FiltraPorTipoYCamara()
    {
        var mensajes = await Cliente().GetFromJsonAsync<Pagina<ProyectoDto>>("/api/proyectos?tipo=1");
        var senado = await Cliente().GetFromJsonAsync<Pagina<ProyectoDto>>("/api/proyectos?camara=2&tamano=100");

        Assert.Equal(65, mensajes!.Total);
        Assert.Equal(212, senado!.Total);
        Assert.All(senado.Elementos, p => Assert.Equal("Senado", p.CamaraOrigen));
    }

    [FactConBaseDatos]
    public async Task EntregaLosValoresDeFiltro()
    {
        var filtros = await Cliente().GetFromJsonAsync<Filtros>("/api/proyectos/filtros");

        Assert.Equal(["Mensaje", "Moción"], filtros!.TiposIniciativa.Select(t => t.Nombre));
        Assert.Equal(["Cámara de Diputados", "Senado"], filtros.Camaras.Select(c => c.Nombre));
        Assert.Contains(2025, filtros.Annos);
    }

    [FactConBaseDatos]
    public async Task EntregaElDetalleDeUnProyectoConSusAutores()
    {
        var p = await Cliente().GetFromJsonAsync<ProyectoDetalleDto>("/api/proyectos/17348-37");

        Assert.NotNull(p);
        Assert.Equal("Senado", p.CamaraOrigen);
        Assert.Equal(5, p.Autores.Count);
        Assert.All(p.Autores, a => Assert.Equal("Senado", a.Camara));
        Assert.Equal(("Isabel", "Allende", "Bussi"), (p.Autores[0].Nombre, p.Autores[0].ApellidoPaterno, p.Autores[0].ApellidoMaterno));
        Assert.Equal(("camara", "17985"), (p.Fuente, p.IdOrigen));
    }

    [FactConBaseDatos]
    public async Task UnMensajeNoTieneAutoresParlamentarios()
    {
        var p = await Cliente().GetFromJsonAsync<ProyectoDetalleDto>("/api/proyectos/17641-13");

        Assert.NotNull(p);
        Assert.Empty(p.Autores);
    }

    [FactConBaseDatos]
    public async Task UnBoletinInexistenteResponde404()
    {
        var r = await Cliente().GetAsync(new Uri("/api/proyectos/99999-99", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
        Assert.Equal("application/problem+json", r.Content.Headers.ContentType?.MediaType);
    }

    [FactConBaseDatos]
    public async Task SaludResponde()
    {
        var r = await Cliente().GetAsync(new Uri("/salud", UriKind.Relative));
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
    }
}
