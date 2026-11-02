using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Pruebas;

[Collection(ColeccionBaseDatos.Nombre)]
public class AutoresPruebas : IAsyncLifetime
{
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task<EjecucionIngesta> EjecutarAsync(FuenteSimulada fuente)
    {
        await using var db = BaseDeDatos.NuevoContexto();
        return await Ingestas.Crear(db, fuente, detalle: true).EjecutarAsync(2025, CancellationToken.None);
    }

    private static async Task<List<(string Boletin, string IdOrigen, int Camara, int Orden)>> AutoriasAsync()
    {
        await using var db = BaseDeDatos.NuevoContexto();
        return (await db.ProyectoAutores
                .Join(db.Proyectos, a => a.ProyectoId, p => p.Id, (a, p) => new { p.Boletin, a.Parlamentario!.IdOrigen, a.Parlamentario.CamaraId, a.Orden })
                .ToListAsync())
            .Select(x => (x.Boletin, x.IdOrigen, x.CamaraId, x.Orden))
            .OrderBy(x => x.Boletin).ThenBy(x => x.Orden)
            .ToList();
    }

    [FactConBaseDatos]
    public async Task DosEjecucionesSeguidasNoDuplicanAutores()
    {
        var fuente = FuenteSimulada.ConFixtures2025();

        var primera = await EjecutarAsync(fuente);
        var autoriasPrimera = await AutoriasAsync();
        var segunda = await EjecutarAsync(fuente);

        Assert.Equal(EstadoEjecucion.Exitosa, primera.Estado);
        Assert.Equal(EstadoEjecucion.Exitosa, segunda.Estado);
        // 1 autor en 17353-07, 5 en 17348-37 y 10 en 17776-16.
        Assert.Equal(16, autoriasPrimera.Count);
        Assert.Equal(autoriasPrimera, await AutoriasAsync());
        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(16, await db.Parlamentarios.CountAsync());
        // La segunda corrida no guarda respuestas nuevas: todas son idénticas a las ya guardadas.
        Assert.Equal(0, segunda.RespuestasNuevas);
    }

    [FactConBaseDatos]
    public async Task DiputadosYSenadoresQuedanEnSuCamara()
    {
        await EjecutarAsync(FuenteSimulada.ConFixtures2025());

        var autorias = await AutoriasAsync();
        Assert.All(autorias.Where(a => a.Boletin == "17348-37"), a => Assert.Equal(LectorProyectos.CodigoSenado, a.Camara));
        Assert.All(autorias.Where(a => a.Boletin != "17348-37"), a => Assert.Equal(LectorProyectos.CodigoDiputados, a.Camara));
    }

    [FactConBaseDatos]
    public async Task SoloSeConsultaElDetalleDeLasMociones()
    {
        var fuente = FuenteSimulada.ConFixtures2025();
        await EjecutarAsync(fuente);

        var detalles = fuente.Llamadas.Where(l => l.StartsWith("retornarProyectoLey:", StringComparison.Ordinal)).ToList();
        Assert.Equal(642, detalles.Count);
        // 17641-13 es un mensaje.
        Assert.DoesNotContain("retornarProyectoLey:17641-13", detalles);
    }

    [FactConBaseDatos]
    public async Task UnAutorQueDesapareceDeLaFuenteSeQuita()
    {
        var fuente = FuenteSimulada.ConFixtures2025();
        await EjecutarAsync(fuente);

        // Sin el último autor de 17776-16 (Alejandra Placencia, Id 1160).
        var xml = Encoding.UTF8.GetString(Fixtures.Camara("retornarProyectoLey-17776-16.xml"));
        var inicio = xml.LastIndexOf("<ParlamentarioAutor>", StringComparison.Ordinal);
        var fin = xml.IndexOf("</ParlamentarioAutor>", inicio, StringComparison.Ordinal) + "</ParlamentarioAutor>".Length;
        fuente.ResponderDetalle("17776-16", Encoding.UTF8.GetBytes(xml.Remove(inicio, fin - inicio)));
        await EjecutarAsync(fuente);

        var autorias = (await AutoriasAsync()).Where(a => a.Boletin == "17776-16").ToList();
        Assert.Equal(9, autorias.Count);
        Assert.DoesNotContain(autorias, a => a.IdOrigen == "1160");
        // El parlamentario se conserva: puede ser autor de otros proyectos.
        await using var db = BaseDeDatos.NuevoContexto();
        Assert.True(await db.Parlamentarios.AnyAsync(p => p.IdOrigen == "1160"));
    }

    [FactConBaseDatos]
    public async Task UnDetalleQueFallaDejaLaEjecucionParcialYNoDetieneLasDemas()
    {
        var fuente = FuenteSimulada.ConFixtures2025();
        fuente.Detalles["17348-37"] = () => new HttpResponseMessage(HttpStatusCode.InternalServerError);

        var e = await EjecutarAsync(fuente);

        Assert.Equal(EstadoEjecucion.Parcial, e.Estado);
        Assert.Contains("17348-37", e.Detalle, StringComparison.Ordinal);
        var autorias = await AutoriasAsync();
        Assert.DoesNotContain(autorias, a => a.Boletin == "17348-37");
        Assert.Equal(11, autorias.Count);
        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(707, await db.Proyectos.CountAsync());
    }

    [FactConBaseDatos]
    public async Task CadaAutoriaApuntaALaRespuestaDeLaQueSalio()
    {
        await EjecutarAsync(FuenteSimulada.ConFixtures2025());

        await using var db = BaseDeDatos.NuevoContexto();
        var proyecto = await db.Proyectos.SingleAsync(p => p.Boletin == "17353-07");
        var autoria = await db.ProyectoAutores.SingleAsync(a => a.ProyectoId == proyecto.Id);
        var cruda = await db.RespuestasCrudas.SingleAsync(c => c.Id == autoria.RespuestaCrudaId);
        Assert.Equal(("retornarProyectoLey", "prmNumeroBoletin=17353-07"), (cruda.Operacion, cruda.Parametros));
    }
}
