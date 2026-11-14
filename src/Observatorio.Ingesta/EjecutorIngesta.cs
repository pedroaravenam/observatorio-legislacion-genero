using Microsoft.Extensions.Options;

namespace Observatorio.Ingesta;

public class OpcionesIngesta
{
    public const string Seccion = "Ingesta";

    /// <summary>Primer año de ingreso a consultar. Sin valor: el año en curso.</summary>
    public int? AnnoDesde { get; set; }

    /// <summary>Último año de ingreso a consultar, inclusive. Sin valor: el año en curso.</summary>
    public int? AnnoHasta { get; set; }

    /// <summary>Consultar el detalle de cada moción para obtener sus autores (una consulta por moción).</summary>
    public bool Detalle { get; set; } = true;

    /// <summary>Consultas de detalle simultáneas a la fuente.</summary>
    public int ConcurrenciaDetalle { get; set; } = 4;

    /// <summary>Boletín puntual del Senado. Si se configura, esta corrida no consulta la Cámara.</summary>
    public string? BoletinSenado { get; set; }

    /// <summary>Ejecutar una consulta diaria por fecha del Senado. Se programa externamente.</summary>
    public bool FechaSenado { get; set; }

    /// <summary>Carga histórica del Senado, reanudable y con cadencia de 21 días.</summary>
    public bool CompletaSenado { get; set; }

    /// <summary>Cargar diputados y reseñas de la BCN, y enlazar con ellos a los autores de las fichas del Senado.</summary>
    public bool Parlamentarios { get; set; }

    /// <summary>Listado de la BCN (reseñas parlamentarias) con sexo derivado.</summary>
    public string RutaBcn { get; set; } = "/app/referencia/parlamentarios-bcn.csv";

    /// <summary>Correcciones a mano: autores que ninguna lista identifica por nombre.</summary>
    public string RutaAlias { get; set; } = "/app/referencia/alias-autores.csv";
}

/// <summary>
/// Ejecuta la ingesta una vez para los años configurados y termina el proceso.
/// El código de salida es distinto de cero si algún año falló, para que el orquestador lo vea.
/// La ejecución programada se incorpora en una fase posterior.
/// </summary>
public sealed partial class EjecutorIngesta(
    IServiceScopeFactory scopes,
    IOptions<OpcionesIngesta> opciones,
    TimeProvider reloj,
    IHostApplicationLifetime vida,
    ILogger<EjecutorIngesta> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (opciones.Value.CompletaSenado)
        {
            using var scope = scopes.CreateScope();
            try
            {
                var ingesta = scope.ServiceProvider.GetRequiredService<IngestaCompletaSenado>();
                var ejecucion = await ingesta.EjecutarSiCorrespondeAsync(stoppingToken).ConfigureAwait(false);
                if (ejecucion is not null)
                    LogResumenCompleto(log, ejecucion.Id, ejecucion.Estado, ejecucion.Detalle);
                Environment.ExitCode = ejecucion is null || ejecucion.Estado == Observatorio.Dominio.EstadoEjecucion.Exitosa ? 0 : 1;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                LogFallaCompleta(log, ex);
                Environment.ExitCode = 1;
            }
            vida.StopApplication();
            return;
        }

        if (opciones.Value.Parlamentarios)
        {
            using var scope = scopes.CreateScope();
            try
            {
                var ingesta = scope.ServiceProvider.GetRequiredService<IngestaParlamentarios>();
                var ejecucion = await ingesta.EjecutarAsync(stoppingToken).ConfigureAwait(false);
                LogResumenParlamentarios(log, ejecucion.Id, ejecucion.RegistrosInsertados, ejecucion.RegistrosActualizados,
                    ejecucion.RegistrosSinCambio, ejecucion.Detalle);
                Environment.ExitCode = 0;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                LogFallaParlamentarios(log, ex);
                Environment.ExitCode = 1;
            }
            vida.StopApplication();
            return;
        }

        if (opciones.Value.FechaSenado)
        {
            using var scope = scopes.CreateScope();
            var horaChile = TimeZoneInfo.ConvertTime(reloj.GetUtcNow(),
                TimeZoneInfo.FindSystemTimeZoneById("America/Santiago"));
            var hoy = DateOnly.FromDateTime(horaChile.DateTime);
            try
            {
                var ingesta = scope.ServiceProvider.GetRequiredService<IngestaFechaSenado>();
                var ejecucion = await ingesta.EjecutarAsync(hoy, stoppingToken).ConfigureAwait(false);
                LogResumenFechaSenado(log, hoy, ejecucion.Id, ejecucion.Parametros,
                    ejecucion.RespuestasNuevas, ejecucion.RespuestasRepetidas,
                    ejecucion.RegistrosInsertados, ejecucion.RegistrosActualizados, ejecucion.RegistrosSinCambio);
                Environment.ExitCode = 0;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                LogFallaFechaSenado(log, ex, hoy);
                Environment.ExitCode = 1;
            }
            vida.StopApplication();
            return;
        }

        var boletinSenado = opciones.Value.BoletinSenado;
        if (!string.IsNullOrWhiteSpace(boletinSenado))
        {
            using var scope = scopes.CreateScope();
            try
            {
                var ingesta = scope.ServiceProvider.GetRequiredService<IngestaFichaSenado>();
                var ejecucion = await ingesta.EjecutarAsync(boletinSenado, stoppingToken).ConfigureAwait(false);
                LogResumenSenado(log, boletinSenado, ejecucion.Id,
                    ejecucion.RespuestasNuevas, ejecucion.RespuestasRepetidas,
                    ejecucion.RegistrosInsertados, ejecucion.RegistrosActualizados, ejecucion.RegistrosSinCambio);
                Environment.ExitCode = 0;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                LogFallaSenado(log, ex, boletinSenado);
                Environment.ExitCode = 1;
            }
            vida.StopApplication();
            return;
        }

        var actual = reloj.GetLocalNow().Year;
        var desde = opciones.Value.AnnoDesde ?? actual;
        var hasta = opciones.Value.AnnoHasta ?? actual;
        var annos = Enumerable.Range(desde, Math.Max(0, hasta - desde + 1));
        var fallas = 0;
        foreach (var anno in annos)
        {
            using var scope = scopes.CreateScope();
            var ingesta = scope.ServiceProvider.GetRequiredService<IngestaProyectosCamara>();
            try
            {
                var e = await ingesta.EjecutarAsync(anno, stoppingToken).ConfigureAwait(false);
                LogResumen(log, anno, e.Id, e.RespuestasNuevas, e.RespuestasRepetidas, e.RegistrosInsertados, e.RegistrosActualizados, e.RegistrosSinCambio);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                fallas++;
                LogFalla(log, ex, anno);
            }
        }
        Environment.ExitCode = fallas == 0 ? 0 : 1;
        vida.StopApplication();
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Año {Anno} (ejecución {Id}): respuestas {Nuevas} nuevas / {Repetidas} repetidas; proyectos {Insertados} insertados, {Actualizados} actualizados, {SinCambio} sin cambio.")]
    private static partial void LogResumen(ILogger log, int anno, long id, int nuevas, int repetidas, int insertados, int actualizados, int sinCambio);

    [LoggerMessage(Level = LogLevel.Error, Message = "La ingesta del año {Anno} falló.")]
    private static partial void LogFalla(ILogger log, Exception ex, int anno);

    [LoggerMessage(Level = LogLevel.Information, Message = "Parlamentarios (ejecución {Id}): {Insertados} insertados, {Actualizados} actualizados, {SinCambio} sin cambio. {Detalle}")]
    private static partial void LogResumenParlamentarios(ILogger log, long id, int insertados, int actualizados, int sinCambio, string? detalle);

    [LoggerMessage(Level = LogLevel.Error, Message = "La carga de parlamentarios falló.")]
    private static partial void LogFallaParlamentarios(ILogger log, Exception ex);

    [LoggerMessage(Level = LogLevel.Information, Message = "Senado {Boletin} (ejecución {Id}): respuestas {Nuevas} nuevas / {Repetidas} repetidas; registros {Insertados} insertados, {Actualizados} actualizados, {SinCambio} sin cambio.")]
    private static partial void LogResumenSenado(ILogger log, string boletin, long id, int nuevas, int repetidas, int insertados, int actualizados, int sinCambio);

    [LoggerMessage(Level = LogLevel.Error, Message = "La ingesta de la ficha del Senado {Boletin} falló.")]
    private static partial void LogFallaSenado(ILogger log, Exception ex, string boletin);

    [LoggerMessage(Level = LogLevel.Information, Message = "Senado por fecha {Hoy} (ejecución {Id}, {Parametros}): respuestas {Nuevas} nuevas / {Repetidas} repetidas; registros {Insertados} insertados, {Actualizados} actualizados, {SinCambio} sin cambio.")]
    private static partial void LogResumenFechaSenado(ILogger log, DateOnly hoy, long id, string parametros, int nuevas, int repetidas, int insertados, int actualizados, int sinCambio);

    [LoggerMessage(Level = LogLevel.Error, Message = "La ingesta diaria del Senado para {Hoy} falló.")]
    private static partial void LogFallaFechaSenado(ILogger log, Exception ex, DateOnly hoy);

    [LoggerMessage(Level = LogLevel.Information, Message = "Carga completa del Senado (ejecución {Id}): {Estado}. {Detalle}")]
    private static partial void LogResumenCompleto(ILogger log, long id, Observatorio.Dominio.EstadoEjecucion estado, string? detalle);

    [LoggerMessage(Level = LogLevel.Error, Message = "La carga completa del Senado falló.")]
    private static partial void LogFallaCompleta(ILogger log, Exception ex);
}
