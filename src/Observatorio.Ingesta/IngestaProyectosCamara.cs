using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Ingesta;

/// <summary>
/// Ingesta de proyectos de ley de un año desde WSLegislativo (mociones y mensajes):
/// consulta → respuesta cruda → normalización, con registro de la ejecución.
/// </summary>
public sealed partial class IngestaProyectosCamara(
    ClienteSoapCamara cliente,
    ObservatorioDbContext db,
    NormalizadorProyectos normalizador,
    IOptions<OpcionesIngesta> opciones,
    TimeProvider reloj,
    ILogger<IngestaProyectosCamara> log)
{
    public const string Proceso = "camara.proyectos";
    private const string Servicio = "WSLegislativo";
    private static readonly string[] Operaciones = ["retornarMocionesXAnno", "retornarMensajesXAnno"];

    private static readonly UTF8Encoding Utf8Estricto = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    public async Task<EjecucionIngesta> EjecutarAsync(int anno, CancellationToken ct)
    {
        var ejecucion = new EjecucionIngesta
        {
            Proceso = Proceso,
            Parametros = $"anno={anno.ToString(CultureInfo.InvariantCulture)}",
            Inicio = reloj.GetUtcNow(),
            Estado = EstadoEjecucion.EnCurso,
        };
        db.Ejecuciones.Add(ejecucion);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);

        try
        {
            var mociones = new List<string>();
            foreach (var operacion in Operaciones)
            {
                var respuesta = await cliente.ConsultarAsync(
                    Servicio, operacion, [new("prmAnno", anno.ToString(CultureInfo.InvariantCulture))], ct).ConfigureAwait(false);

                var (cruda, nueva) = await GuardarCrudaAsync(respuesta, ejecucion.Id, ct).ConfigureAwait(false);
                if (nueva) ejecucion.RespuestasNuevas++; else ejecucion.RespuestasRepetidas++;

                var resultado = await normalizador.NormalizarAsync(cruda, ct).ConfigureAwait(false);
                ejecucion.RegistrosInsertados += resultado.Insertados;
                ejecucion.RegistrosActualizados += resultado.Actualizados;
                ejecucion.RegistrosSinCambio += resultado.SinCambio;
                LogOperacion(log, operacion, anno, nueva ? "nueva" : "repetida", resultado.Insertados, resultado.Actualizados, resultado.SinCambio);

                // Solo las mociones tienen autores parlamentarios; los mensajes son del Ejecutivo.
                if (operacion == "retornarMocionesXAnno")
                {
                    mociones.AddRange(LectorProyectos.LeerLista(respuesta.Contenido, operacion).Select(p => p.Boletin).Distinct());
                }
            }

            var fallidos = opciones.Value.Detalle ? await IngestarAutoresAsync(mociones, ejecucion, ct).ConfigureAwait(false) : [];
            ejecucion.Estado = fallidos.Count == 0 ? EstadoEjecucion.Exitosa : EstadoEjecucion.Parcial;
            if (fallidos.Count > 0)
            {
                ejecucion.Detalle = Truncar($"Detalle fallido en {fallidos.Count} de {mociones.Count} mociones: {string.Join(", ", fallidos)}", 4000);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            ejecucion.Estado = EstadoEjecucion.Fallida;
            ejecucion.Detalle = Truncar(ex.Message, 4000);
            db.ChangeTracker.Clear();
            db.Ejecuciones.Update(ejecucion);
            throw;
        }
        finally
        {
            ejecucion.Termino = reloj.GetUtcNow();
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(false);
        }
        return ejecucion;
    }

    /// <summary>
    /// Consulta el detalle de cada moción y sincroniza sus autores. Las consultas corren en paralelo,
    /// con un límite para no saturar la fuente; el guardado es secuencial porque el contexto de datos no admite concurrencia.
    /// Una moción que falla no detiene las demás: se devuelve en la lista de fallidas.
    /// </summary>
    private async Task<List<string>> IngestarAutoresAsync(List<string> boletines, EjecucionIngesta ejecucion, CancellationToken ct)
    {
        var respuestas = new RespuestaFuente?[boletines.Count];
        var errores = new string?[boletines.Count];
        await Parallel.ForAsync(0, boletines.Count,
            new ParallelOptions { MaxDegreeOfParallelism = Math.Max(1, opciones.Value.ConcurrenciaDetalle), CancellationToken = ct },
            async (i, token) =>
            {
                try
                {
                    respuestas[i] = await cliente.ConsultarAsync(Servicio, "retornarProyectoLey", [new("prmNumeroBoletin", boletines[i])], token).ConfigureAwait(false);
                }
                catch (FuenteNoDisponibleException ex)
                {
                    errores[i] = ex.Message;
                }
            }).ConfigureAwait(false);

        var fallidos = new List<string>();
        int agregados = 0, quitados = 0, sinCambio = 0, nuevos = 0, desconocidos = 0;
        for (var i = 0; i < boletines.Count; i++)
        {
            if (respuestas[i] is not { } respuesta)
            {
                fallidos.Add(boletines[i]);
                LogDetalleFallido(log, boletines[i], errores[i] ?? "sin respuesta");
                continue;
            }
            var (cruda, nueva) = await GuardarCrudaAsync(respuesta, ejecucion.Id, ct).ConfigureAwait(false);
            if (nueva) ejecucion.RespuestasNuevas++; else ejecucion.RespuestasRepetidas++;

            var r = await normalizador.NormalizarAutoresAsync(cruda, ct).ConfigureAwait(false);
            if (r is null) { desconocidos++; continue; }
            agregados += r.Agregados;
            quitados += r.Quitados;
            sinCambio += r.SinCambio + r.Actualizados;
            nuevos += r.ParlamentariosNuevos;
        }
        LogAutores(log, boletines.Count, agregados, quitados, sinCambio, nuevos, desconocidos, fallidos.Count);
        return fallidos;
    }

    /// <summary>
    /// Guarda la respuesta salvo que ya exista una idéntica para la misma consulta.
    /// Devuelve la respuesta guardada y si fue nueva.
    /// </summary>
    private async Task<(RespuestaCruda Cruda, bool Nueva)> GuardarCrudaAsync(RespuestaFuente r, long ejecucionId, CancellationToken ct)
    {
        var hash = Convert.ToHexStringLower(SHA256.HashData(r.Contenido));
        var fuente = NormalizadorProyectos.Fuente;
        var existente = await db.RespuestasCrudas.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Fuente == fuente && x.Operacion == r.Operacion && x.Parametros == r.Parametros && x.Hash == hash, ct)
            .ConfigureAwait(false);
        if (existente is not null) return (existente, false);

        var cruda = new RespuestaCruda
        {
            Fuente = fuente,
            Operacion = r.Operacion,
            Parametros = r.Parametros,
            Url = r.Url,
            FechaConsulta = r.FechaConsulta,
            EstadoHttp = r.EstadoHttp,
            Hash = hash,
            // Si la fuente declarara UTF-8 y no lo fuera, se prefiere fallar a guardar texto alterado.
            Contenido = Utf8Estricto.GetString(r.Contenido),
            EjecucionId = ejecucionId,
        };
        db.RespuestasCrudas.Add(cruda);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return (cruda, true);
    }

    private static string Truncar(string s, int largo) => s.Length <= largo ? s : s[..largo];

    [LoggerMessage(Level = LogLevel.Information, Message = "Autores de {Mociones} mociones: {Agregados} agregados, {Quitados} quitados, {SinCambio} sin cambio; {Nuevos} parlamentarios nuevos; {Desconocidos} boletines desconocidos por la fuente; {Fallidos} con detalle fallido.")]
    private static partial void LogAutores(ILogger log, int mociones, int agregados, int quitados, int sinCambio, int nuevos, int desconocidos, int fallidos);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Detalle de {Boletin} no disponible: {Motivo}")]
    private static partial void LogDetalleFallido(ILogger log, string boletin, string motivo);

    [LoggerMessage(Level = LogLevel.Information, Message = "{Operacion} {Anno}: respuesta {Estado}; {Insertados} insertados, {Actualizados} actualizados, {SinCambio} sin cambio.")]
    private static partial void LogOperacion(ILogger log, string operacion, int anno, string estado, int insertados, int actualizados, int sinCambio);
}
