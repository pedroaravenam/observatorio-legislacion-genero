using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;
using Observatorio.Ingesta;

namespace Observatorio.Pruebas;

public class LectorFichaSenadoPruebas
{
    [Fact]
    public void LeeFichaRealYConservaOrdenDeTramites()
    {
        var ficha = LectorFichaSenado.Leer(Fixtures.Senado("17641-13.xml"), "17641-13");

        Assert.Equal("17641-13", ficha.Boletin);
        Assert.Equal("Publicado", ficha.Estado);
        Assert.Equal(41, ficha.Tramites.Count);
        Assert.Equal((1, new DateOnly(2025, 7, 1), "C.Diputados"),
            (ficha.Tramites[0].Posicion, ficha.Tramites[0].Fecha, ficha.Tramites[0].Camara));
        Assert.Equal(17641, LectorFichaSenado.NumeroParaConsulta(ficha.Boletin));
    }

    [Fact]
    public void RechazaPaginaDeErrorYBoletinDistinto()
    {
        Assert.Throws<FuenteSenadoException>(() => LectorFichaSenado.Leer("<html>Error</html>"u8.ToArray(), "17641-13"));
        Assert.Throws<FuenteSenadoException>(() => LectorFichaSenado.Leer(Fixtures.Senado("17641-13.xml"), "17642-13"));
    }

    [Fact]
    public void LaCargaCompletaAceptaFichaHistoricaSinTramites()
    {
        Assert.Throws<FuenteSenadoException>(() => LectorFichaSenado.Leer(Fixtures.Senado("1110-01.xml"), "1110-01"));
        var ficha = LectorFichaSenado.Leer(Fixtures.Senado("1110-01.xml"), "1110-01", permitirSinTramites: true);
        Assert.Empty(ficha.Tramites);
        Assert.Equal("Archivado", ficha.Estado);
    }

    [Fact]
    public void ReconoceAusenciaConocidaSinConfundirUnErrorGenerico()
    {
        Assert.True(LectorFichaSenado.EsSinDato("<proyectos></proyectos>\n"u8.ToArray()));
        Assert.True(LectorFichaSenado.EsSinDato(
            "<div>No existe el n&uacute;mero de bolet&iacute;n solicitado</div>"u8.ToArray()));
        Assert.False(LectorFichaSenado.EsSinDato("<html>Error del servicio</html>"u8.ToArray()));
    }
}

[Collection(ColeccionBaseDatos.Nombre)]
public class IngestaFichaSenadoPruebas : IAsyncLifetime
{
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    private static async Task CargarCamaraAsync()
    {
        await using var db = BaseDeDatos.NuevoContexto();
        await Ingestas.Crear(db, FuenteSimulada.ConFixtures2025(), detalle: false).EjecutarAsync(2025, CancellationToken.None);
    }

    private static async Task<EjecucionIngesta> EjecutarAsync(SenadoSimulado fuente, TimeProvider? reloj = null,
        string origen = "ficha", ContextoCargaSenado? contexto = null)
    {
        reloj ??= TimeProvider.System;
        await using var db = BaseDeDatos.NuevoContexto();
        var ingesta = new IngestaFichaSenado(fuente.Cliente(reloj), db, new NormalizadorSenado(db, reloj), reloj);
        return await ingesta.EjecutarAsync("17641-13", CancellationToken.None, origen, contexto);
    }

    private sealed class RelojManual(DateTimeOffset inicio) : TimeProvider
    {
        public DateTimeOffset Ahora { get; set; } = inicio;
        public override DateTimeOffset GetUtcNow() => Ahora;
    }

    [FactConBaseDatos]
    public async Task LaVerificacionAvanzaConUnaRespuestaRepetidaSinMoverLaFechaDelCambio()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado();
        var reloj = new RelojManual(new DateTimeOffset(2026, 11, 1, 10, 0, 0, TimeSpan.Zero));
        await EjecutarAsync(fuente, reloj);
        var primera = reloj.Ahora;
        reloj.Ahora = primera.AddDays(1);

        var segunda = await EjecutarAsync(fuente, reloj);

        Assert.Equal(1, segunda.RespuestasRepetidas);
        await using var db = BaseDeDatos.NuevoContexto();
        var proyecto = await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        Assert.Equal(primera, proyecto.FechaConsultaSenado);
        Assert.Equal(primera.AddDays(1), proyecto.VerificadoSenado);
    }

    [FactConBaseDatos]
    public async Task LaDesactualizacionUsaLaUltimaVerificacionDeLaFichaYNoLaCargaAnterior()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado();
        var reloj = new RelojManual(new DateTimeOffset(2026, 11, 1, 10, 0, 0, TimeSpan.Zero));
        var cargaAnterior = reloj.Ahora;
        await EjecutarAsync(fuente, reloj);
        reloj.Ahora = cargaAnterior.AddDays(1);
        await EjecutarAsync(fuente, reloj);
        var ultimaVerificacion = reloj.Ahora;

        reloj.Ahora = cargaAnterior.AddDays(3);
        long padre;
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var ejecucion = new EjecucionIngesta
            {
                Proceso = IngestaCompletaSenado.Proceso, Parametros = "prueba", Inicio = reloj.Ahora,
                Estado = EstadoEjecucion.EnCurso,
            };
            db.Ejecuciones.Add(ejecucion);
            await db.SaveChangesAsync();
            padre = ejecucion.Id;
        }
        fuente.Contenido = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(fuente.Contenido).Replace(
            "Ingreso de proyecto .", "Ingreso de proyecto corregido.", StringComparison.Ordinal));
        await EjecutarAsync(fuente, reloj, "completa", new ContextoCargaSenado(padre, cargaAnterior));

        await using var verificacion = BaseDeDatos.NuevoContexto();
        var diferencia = await verificacion.DesactualizacionesSenado.SingleAsync();
        Assert.Equal(ultimaVerificacion, diferencia.UltimaConfirmacion);
        var proyecto = await verificacion.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        Assert.Equal(reloj.Ahora, proyecto.VerificadoSenado);
    }

    [FactConBaseDatos]
    public async Task DosEjecucionesGuardanUnaRespuestaYNoDuplicanTramites()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado();

        var primera = await EjecutarAsync(fuente);
        var segunda = await EjecutarAsync(fuente);

        Assert.Equal(EstadoEjecucion.Exitosa, primera.Estado);
        Assert.Equal((1, 0, 41, 1), (primera.RespuestasNuevas, primera.RespuestasRepetidas,
            primera.RegistrosInsertados, primera.RegistrosActualizados));
        Assert.Equal((0, 1, 0, 0, 42), (segunda.RespuestasNuevas, segunda.RespuestasRepetidas,
            segunda.RegistrosInsertados, segunda.RegistrosActualizados, segunda.RegistrosSinCambio));
        Assert.Equal("?boletin=17641", fuente.UltimaConsulta?.Query);

        await using var db = BaseDeDatos.NuevoContexto();
        var proyecto = await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        var cruda = await db.RespuestasCrudas.SingleAsync(x => x.Fuente == "senado");
        Assert.Equal("camara", proyecto.Fuente);
        Assert.Equal("Publicado", proyecto.EstadoSenado);
        Assert.Equal(cruda.Id, proyecto.RespuestaSenadoId);
        Assert.Equal(Fixtures.Senado("17641-13.xml"), Encoding.UTF8.GetBytes(cruda.Contenido));
        Assert.Equal(41, await db.TramitesSenado.CountAsync());
        var primero = await db.TramitesSenado.SingleAsync(x => x.Posicion == 1);
        Assert.Equal(cruda.Id, primero.RespuestaCrudaId);
        Assert.Equal(new DateOnly(2025, 7, 1), primero.Fecha);
        Assert.StartsWith("Ingreso de proyecto .", primero.Descripcion, StringComparison.Ordinal);
    }

    [FactConBaseDatos]
    public async Task CambioDeUnTramiteActualizaUnaFilaYConservaLaAnterior()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado();
        await EjecutarAsync(fuente);
        fuente.Contenido = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(fuente.Contenido).Replace(
            "Ingreso de proyecto .", "Ingreso de proyecto corregido.", StringComparison.Ordinal));

        var segunda = await EjecutarAsync(fuente);

        Assert.Equal((1, 0, 0, 1, 41), (segunda.RespuestasNuevas, segunda.RespuestasRepetidas,
            segunda.RegistrosInsertados, segunda.RegistrosActualizados, segunda.RegistrosSinCambio));
        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(2, await db.RespuestasCrudas.CountAsync(x => x.Fuente == "senado"));
        Assert.Equal(41, await db.TramitesSenado.CountAsync());
        var primero = await db.TramitesSenado.SingleAsync(x => x.Posicion == 1);
        Assert.StartsWith("Ingreso de proyecto corregido.", primero.Descripcion, StringComparison.Ordinal);
        var proyecto = await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        Assert.Equal("camara", proyecto.Fuente);
        Assert.NotEqual(primero.RespuestaCrudaId, proyecto.RespuestaSenadoId);
    }

    [FactConBaseDatos]
    public async Task RespuestaHtmlConCodigo200QuedaGuardadaYNoAlteraElProyecto()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado { Contenido = "<html>Error del servicio</html>"u8.ToArray() };

        await Assert.ThrowsAsync<FuenteSenadoException>(() => EjecutarAsync(fuente));

        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(EstadoEjecucion.Fallida, (await db.Ejecuciones.SingleAsync(x => x.Proceso == IngestaFichaSenado.Proceso)).Estado);
        Assert.Equal("<html>Error del servicio</html>", (await db.RespuestasCrudas.SingleAsync(x => x.Fuente == "senado")).Contenido);
        Assert.Null((await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13")).EstadoSenado);
        Assert.Equal(0, await db.TramitesSenado.CountAsync());
    }

    [FactConBaseDatos]
    public async Task FichaIncompletaConCodigo200NoBorraTramitesPrevios()
    {
        await CargarCamaraAsync();
        var fuente = new SenadoSimulado();
        await EjecutarAsync(fuente);
        fuente.Contenido = "<proyectos><proyecto><descripcion><boletin>17641-13</boletin><titulo>Proyecto</titulo><estado>Publicado</estado></descripcion><tramitacion /></proyecto></proyectos>"u8.ToArray();

        await Assert.ThrowsAsync<FuenteSenadoException>(() => EjecutarAsync(fuente));

        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(41, await db.TramitesSenado.CountAsync());
        Assert.Equal(2, await db.RespuestasCrudas.CountAsync(x => x.Fuente == "senado"));
        Assert.Equal(EstadoEjecucion.Fallida, (await db.Ejecuciones.OrderByDescending(x => x.Id).FirstAsync()).Estado);
    }

    private sealed class SenadoSimulado : HttpMessageHandler
    {
        public byte[] Contenido { get; set; } = Fixtures.Senado("17641-13.xml");
        public Uri? UltimaConsulta { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            UltimaConsulta = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Contenido) });
        }

        public ClienteSenado Cliente(TimeProvider? reloj = null) => new(
            new HttpClient(this, disposeHandler: false),
            Options.Create(new OpcionesSenado { Intentos = 1 }),
            reloj ?? TimeProvider.System,
            NullLogger<ClienteSenado>.Instance);
    }
}
