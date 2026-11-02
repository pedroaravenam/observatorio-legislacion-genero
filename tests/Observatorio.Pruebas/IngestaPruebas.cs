using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Pruebas;

[Collection(ColeccionBaseDatos.Nombre)]
public class IngestaPruebas : IAsyncLifetime
{
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>Sin detalle: estas pruebas cubren las listas. Los autores tienen sus propias pruebas.</summary>
    private static async Task<EjecucionIngesta> EjecutarAsync(FuenteSimulada fuente, int anno = 2025)
    {
        await using var db = BaseDeDatos.NuevoContexto();
        return await Ingestas.Crear(db, fuente, detalle: false).EjecutarAsync(anno, CancellationToken.None);
    }

    [FactConBaseDatos]
    public async Task DosEjecucionesSeguidasNoDuplicanNada()
    {
        var fuente = FuenteSimulada.ConFixtures2025();

        var primera = await EjecutarAsync(fuente);
        var segunda = await EjecutarAsync(fuente);

        Assert.Equal(EstadoEjecucion.Exitosa, primera.Estado);
        Assert.Equal((2, 0, 707, 0, 0), (primera.RespuestasNuevas, primera.RespuestasRepetidas, primera.RegistrosInsertados, primera.RegistrosActualizados, primera.RegistrosSinCambio));
        Assert.Equal(EstadoEjecucion.Exitosa, segunda.Estado);
        Assert.Equal((0, 2, 0, 0, 707), (segunda.RespuestasNuevas, segunda.RespuestasRepetidas, segunda.RegistrosInsertados, segunda.RegistrosActualizados, segunda.RegistrosSinCambio));

        await using var db = BaseDeDatos.NuevoContexto();
        Assert.Equal(707, await db.Proyectos.CountAsync());
        Assert.Equal(2, await db.RespuestasCrudas.CountAsync());
        Assert.Equal(2, await db.Ejecuciones.CountAsync(e => e.Estado == EstadoEjecucion.Exitosa));
    }

    [FactConBaseDatos]
    public async Task CadaProyectoConservaSuProcedencia()
    {
        await EjecutarAsync(FuenteSimulada.ConFixtures2025());

        await using var db = BaseDeDatos.NuevoContexto();
        var p = await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        var cruda = await db.RespuestasCrudas.SingleAsync(x => x.Id == p.RespuestaCrudaId);
        Assert.Equal(("camara", "18286"), (p.Fuente, p.IdOrigen));
        Assert.Equal("retornarMensajesXAnno", cruda.Operacion);
        Assert.Equal("prmAnno=2025", cruda.Parametros);
        Assert.Equal(cruda.FechaConsulta, p.FechaConsulta);
        Assert.Contains("<NumeroBoletin>17641-13</NumeroBoletin>", cruda.Contenido, StringComparison.Ordinal);
        // El contenido guardado es exactamente lo recibido.
        Assert.Equal(Fixtures.Camara("retornarMensajesXAnno-2025.xml"), System.Text.Encoding.UTF8.GetBytes(cruda.Contenido));
    }

    [FactConBaseDatos]
    public async Task UnCambioEnLaFuenteActualizaSoloLoQueCambio()
    {
        var fuente = FuenteSimulada.ConFixtures2025();
        await EjecutarAsync(fuente);

        var original = System.Text.Encoding.UTF8.GetString(Fixtures.Camara("retornarMensajesXAnno-2025.xml"));
        fuente.Responder("retornarMensajesXAnno", original.Replace(
            "Crea un nuevo sistema de subsidio unificado al empleo", "Crea un sistema de subsidio unificado al empleo", StringComparison.Ordinal));
        var segunda = await EjecutarAsync(fuente);

        Assert.Equal((1, 1, 0, 1, 706), (segunda.RespuestasNuevas, segunda.RespuestasRepetidas, segunda.RegistrosInsertados, segunda.RegistrosActualizados, segunda.RegistrosSinCambio));
        await using var db = BaseDeDatos.NuevoContexto();
        var p = await db.Proyectos.SingleAsync(x => x.Boletin == "17641-13");
        Assert.Equal("Crea un sistema de subsidio unificado al empleo", p.Titulo);
        Assert.Equal(3, await db.RespuestasCrudas.CountAsync());
    }

    [FactConBaseDatos]
    public async Task UnaFallaDeLaFuenteQuedaRegistradaYNoTocaLosDatos()
    {
        var fuente = FuenteSimulada.ConFixtures2025();
        fuente.Responder("retornarMensajesXAnno", "<html>Servicio no disponible</html>");

        await Assert.ThrowsAsync<FuenteNoDisponibleException>(() => EjecutarAsync(fuente));

        await using var db = BaseDeDatos.NuevoContexto();
        var e = await db.Ejecuciones.SingleAsync();
        Assert.Equal(EstadoEjecucion.Fallida, e.Estado);
        Assert.NotNull(e.Termino);
        Assert.Contains("retornarMensajesXAnno", e.Detalle, StringComparison.Ordinal);
        // Se reintentó antes de rendirse.
        Assert.Equal(2, fuente.Llamadas.Count(x => x == "retornarMensajesXAnno"));
        // Lo que sí llegó (mociones) quedó guardado y normalizado; lo que falló no dejó rastros a medias.
        Assert.Equal(642, await db.Proyectos.CountAsync());
        Assert.Equal(1, await db.RespuestasCrudas.CountAsync());
    }
}
