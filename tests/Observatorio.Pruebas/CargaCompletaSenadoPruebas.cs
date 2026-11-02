using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;
using Observatorio.Ingesta;

namespace Observatorio.Pruebas;

[Collection(ColeccionBaseDatos.Nombre)]
public class CargaCompletaSenadoPruebas : IAsyncLifetime
{
    private readonly string catalogo = Path.Combine(Path.GetTempPath(), $"observatorio-catalogo-{Guid.NewGuid():N}.csv");
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() { if (File.Exists(catalogo)) File.Delete(catalogo); return Task.CompletedTask; }

    private async Task<EjecucionIngesta?> CorrerAsync(RelojManual reloj, SenadoSimulado fuente)
    {
        await File.WriteAllTextAsync(catalogo, "boletin,anio\n17641-13,2025\n11929-13,2018\n1110-01,1993\n125-07,1990\n");
        var servicios = new ServiceCollection();
        servicios.AddObservatorioDatos(BaseDeDatos.CadenaExigida);
        servicios.AddSingleton<TimeProvider>(reloj);
        servicios.AddScoped<NormalizadorSenado>();
        servicios.AddScoped<IngestaFichaSenado>();
        servicios.AddScoped(_ => new ClienteSenado(new HttpClient(fuente, disposeHandler: false),
            Options.Create(new OpcionesSenado { Intentos = 1 }), reloj,
            NullLogger<ClienteSenado>.Instance));
        await using var proveedor = servicios.BuildServiceProvider();
        await using var db = BaseDeDatos.NuevoContexto();
        var carga = new IngestaCompletaSenado(db, proveedor.GetRequiredService<IServiceScopeFactory>(),
            Options.Create(new OpcionesCargaSenado
            {
                RutaCatalogo = catalogo, MinimoBoletines = 4, PausaEntreConsultas = TimeSpan.Zero,
                MaximoFallosSeguidos = 1,
            }), reloj);
        return await carga.EjecutarSiCorrespondeAsync(CancellationToken.None);
    }

    [FactConBaseDatos]
    public async Task PrimeraCargaEsBaseYLaSiguienteRegistraCambioOmitidoYPrimeraVista()
    {
        var reloj = new RelojManual(new DateTimeOffset(2026, 10, 31, 8, 0, 0, TimeSpan.Zero));
        var fuente = new SenadoSimulado();
        var primera = await CorrerAsync(reloj, fuente);
        Assert.Equal(EstadoEjecucion.Exitosa, primera!.Estado);
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            Assert.Equal(49, await db.ObservacionesSenado.CountAsync());
            var historico = await db.Proyectos.SingleAsync(x => x.Boletin == "1110-01");
            Assert.Equal(0, await db.TramitesSenado.CountAsync(x => x.ProyectoId == historico.Id));
            Assert.Equal("sin_dato", (await db.Ejecuciones.SingleAsync(x => x.Parametros == "boletin=125-07")).Detalle);
            Assert.Equal(0, await db.DesactualizacionesSenado.CountAsync());
            Assert.Equal(4, await db.Ejecuciones.CountAsync(x => x.EjecucionPadreId == primera.Id));
            Assert.Equal(49, await db.ObservacionesSenado.CountAsync(x => x.Origen == "base"));
            var primerTramite = await db.ObservacionesSenado.FirstAsync(x => x.FechaTramite == new DateOnly(2025, 7, 1));
            Assert.Equal(new DateOnly(2026, 10, 31).DayNumber - new DateOnly(2025, 7, 1).DayNumber,
                primerTramite.RetrasoDias);
            Assert.Equal("al_dia", (await db.EstadosFuentes.SingleAsync()).Estado);
        }

        reloj.Ahora = reloj.Ahora.AddDays(14);
        fuente.SegundaFicha = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(Fixtures.Senado("11929-13.xml"))
            .Replace("Ingreso de proyecto", "Ingreso corregido de proyecto", StringComparison.Ordinal));
        var segunda = await CorrerAsync(reloj, fuente);
        Assert.Equal(EstadoEjecucion.Exitosa, segunda!.Estado);
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var cambios = await db.DesactualizacionesSenado.ToListAsync();
            Assert.Single(cambios);
            Assert.Equal(1, cambios[0].Actualizados);
            Assert.Equal(primera.Termino, cambios[0].UltimaConfirmacion);
            Assert.Equal(50, await db.ObservacionesSenado.CountAsync());
            Assert.Equal(1, await db.ObservacionesSenado.CountAsync(x => x.Origen == "completa"));
        }
        Assert.Null(await CorrerAsync(reloj, fuente));
    }

    [FactConBaseDatos]
    public async Task CorridaParcialSeReanudaSinReconsultarBoletinesTerminados()
    {
        var reloj = new RelojManual(new DateTimeOffset(2026, 10, 31, 8, 0, 0, TimeSpan.Zero));
        var fuente = new SenadoSimulado { FallarSegundo = true };
        var primera = await CorrerAsync(reloj, fuente);
        Assert.Equal(EstadoEjecucion.Parcial, primera!.Estado);
        Assert.Null(primera.Termino);
        fuente.FallarSegundo = false;
        var segunda = await CorrerAsync(reloj, fuente);
        Assert.Equal(primera.Id, segunda!.Id);
        Assert.Equal(EstadoEjecucion.Exitosa, segunda.Estado);
        Assert.Equal(1, fuente.Consultas.Count(x => x == "?boletin=17641"));
        Assert.Equal(2, fuente.Consultas.Count(x => x == "?boletin=11929"));
    }

    private sealed class RelojManual(DateTimeOffset inicio) : TimeProvider
    {
        public DateTimeOffset Ahora { get; set; } = inicio;
        public override DateTimeOffset GetUtcNow() => Ahora;
    }

    private sealed class SenadoSimulado : HttpMessageHandler
    {
        public bool FallarSegundo { get; set; }
        public byte[]? SegundaFicha { get; set; }
        public List<string> Consultas { get; } = [];
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var consulta = request.RequestUri!.Query;
            Consultas.Add(consulta);
            if (consulta == "?boletin=11929" && FallarSegundo)
                throw new HttpRequestException("Falla simulada");
            var contenido = consulta switch
            {
                "?boletin=125" => "<proyectos></proyectos>\n"u8.ToArray(),
                "?boletin=1110" => Fixtures.Senado("1110-01.xml"),
                "?boletin=11929" => SegundaFicha ?? Fixtures.Senado("11929-13.xml"),
                _ => Fixtures.Senado("17641-13.xml"),
            };
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                { Content = new ByteArrayContent(contenido) });
        }
    }
}
