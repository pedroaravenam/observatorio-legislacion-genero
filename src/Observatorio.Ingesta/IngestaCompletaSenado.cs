using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;

namespace Observatorio.Ingesta;

public sealed class OpcionesCargaSenado
{
    public const string Seccion = "CargaSenado";
    public string RutaCatalogo { get; set; } = "/app/referencia/titulos-boletines-1990-2026.csv";
    public int MinimoBoletines { get; set; } = 18000;
    public TimeSpan PausaEntreConsultas { get; set; } = TimeSpan.FromSeconds(1);
    public int MaximoFallosSeguidos { get; set; } = 5;
}

/// <summary>Carga histórica reanudable. Cada ficha se confirma por separado y una corrida parcial se retoma.</summary>
public sealed class IngestaCompletaSenado(
    ObservatorioDbContext db,
    IServiceScopeFactory scopes,
    IOptions<OpcionesCargaSenado> opciones,
    TimeProvider reloj)
{
    public const string Proceso = "senado.completa";

    public async Task<EjecucionIngesta?> EjecutarSiCorrespondeAsync(CancellationToken ct)
    {
        var anterior = await db.Ejecuciones.AsNoTracking()
            .Where(x => x.Proceso == Proceso && x.Estado == EstadoEjecucion.Exitosa)
            .OrderByDescending(x => x.Termino).FirstOrDefaultAsync(ct).ConfigureAwait(false);
        var pendiente = await db.Ejecuciones
            .Where(x => x.Proceso == Proceso && x.Termino == null &&
                (x.Estado == EstadoEjecucion.EnCurso || x.Estado == EstadoEjecucion.Parcial))
            .OrderBy(x => x.Inicio).FirstOrDefaultAsync(ct).ConfigureAwait(false);
        var ahoraChile = TimeZoneInfo.ConvertTime(reloj.GetUtcNow(),
            TimeZoneInfo.FindSystemTimeZoneById("America/Santiago"));
        if (pendiente is null)
        {
            var transcurrido = anterior?.Termino is null ? TimeSpan.MaxValue : reloj.GetUtcNow() - anterior.Termino.Value;
            if (transcurrido < TimeSpan.FromDays(13)) return null;
            var finDeSemana = ahoraChile.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            if (!finDeSemana && (anterior is null || transcurrido < TimeSpan.FromDays(15))) return null;
        }

        var boletines = await LeerCatalogoAsync(ct).ConfigureAwait(false);
        var ejecucion = pendiente ?? new EjecucionIngesta
        {
            Proceso = Proceso,
            Parametros = $"catalogo={Path.GetFileName(opciones.Value.RutaCatalogo)};total={boletines.Count}",
            Inicio = reloj.GetUtcNow(),
            Estado = EstadoEjecucion.EnCurso,
        };
        if (pendiente is null)
        {
            db.Ejecuciones.Add(ejecucion);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        else ejecucion.Estado = EstadoEjecucion.EnCurso;

        var completados = (await db.Ejecuciones.AsNoTracking()
            .Where(x => x.Proceso == IngestaFichaSenado.Proceso && x.EjecucionPadreId == ejecucion.Id &&
                x.Estado == EstadoEjecucion.Exitosa)
            .Select(x => x.Parametros).ToListAsync(ct).ConfigureAwait(false))
            .Where(x => x.StartsWith("boletin=", StringComparison.Ordinal))
            .Select(x => x[8..]).ToHashSet(StringComparer.Ordinal);
        var fallas = 0;
        var seguidas = 0;
        foreach (var boletin in boletines)
        {
            ct.ThrowIfCancellationRequested();
            if (completados.Contains(boletin)) continue;
            EjecucionIngesta resultado;
            try
            {
                using var scope = scopes.CreateScope();
                var ingesta = scope.ServiceProvider.GetRequiredService<IngestaFichaSenado>();
                resultado = await ingesta.EjecutarAsync(boletin, ct,
                    anterior is null ? "base" : "completa",
                    new ContextoCargaSenado(ejecucion.Id, anterior?.Termino))
                    .ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                fallas++;
                seguidas++;
                ejecucion.Detalle = $"Último fallo: {boletin}: {ex.Message}"[..Math.Min(4000, $"Último fallo: {boletin}: {ex.Message}".Length)];
                if (seguidas >= Math.Max(1, opciones.Value.MaximoFallosSeguidos)) break;
                await Task.Delay(opciones.Value.PausaEntreConsultas, reloj, ct).ConfigureAwait(false);
                continue;
            }
            ejecucion.RespuestasNuevas += resultado.RespuestasNuevas;
            ejecucion.RespuestasRepetidas += resultado.RespuestasRepetidas;
            ejecucion.RegistrosInsertados += resultado.RegistrosInsertados;
            ejecucion.RegistrosActualizados += resultado.RegistrosActualizados;
            ejecucion.RegistrosSinCambio += resultado.RegistrosSinCambio;
            completados.Add(boletin);
            seguidas = 0;
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
            await Task.Delay(opciones.Value.PausaEntreConsultas, reloj, ct).ConfigureAwait(false);
        }

        var pendientes = boletines.Count - completados.Count;
        var exitosas = await db.Ejecuciones.AsNoTracking()
            .Where(x => x.EjecucionPadreId == ejecucion.Id && x.Estado == EstadoEjecucion.Exitosa)
            .ToListAsync(ct).ConfigureAwait(false);
        ejecucion.RespuestasNuevas = exitosas.Sum(x => x.RespuestasNuevas);
        ejecucion.RespuestasRepetidas = exitosas.Sum(x => x.RespuestasRepetidas);
        ejecucion.RegistrosInsertados = exitosas.Sum(x => x.RegistrosInsertados);
        ejecucion.RegistrosActualizados = exitosas.Sum(x => x.RegistrosActualizados);
        ejecucion.RegistrosSinCambio = exitosas.Sum(x => x.RegistrosSinCambio);
        if (pendientes == 0)
        {
            ejecucion.Estado = EstadoEjecucion.Exitosa;
            ejecucion.Termino = reloj.GetUtcNow();
            ejecucion.Detalle = $"Total {boletines.Count}; diferencias detectadas: " +
                await db.DesactualizacionesSenado.CountAsync(x => x.EjecucionId == ejecucion.Id, ct).ConfigureAwait(false);
            await EstadoFuenteSenado.RegistrarAsync(db, Proceso, ejecucion.Termino.Value, null, ct).ConfigureAwait(false);
        }
        else
        {
            ejecucion.Estado = EstadoEjecucion.Parcial;
            ejecucion.Detalle = $"Pendientes {pendientes}; fallas en esta pasada {fallas}. {ejecucion.Detalle}"[..Math.Min(4000,
                $"Pendientes {pendientes}; fallas en esta pasada {fallas}. {ejecucion.Detalle}".Length)];
            await EstadoFuenteSenado.RegistrarAsync(db, Proceso, reloj.GetUtcNow(), ejecucion.Detalle, ct).ConfigureAwait(false);
        }
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return ejecucion;
    }

    private async Task<IReadOnlyList<string>> LeerCatalogoAsync(CancellationToken ct)
    {
        if (!File.Exists(opciones.Value.RutaCatalogo))
            throw new FileNotFoundException("Falta el catálogo histórico de boletines del Senado.", opciones.Value.RutaCatalogo);
        var boletines = new HashSet<string>(StringComparer.Ordinal);
        foreach (var linea in File.ReadLines(opciones.Value.RutaCatalogo).Skip(1))
        {
            var indice = linea.IndexOf(',');
            if (indice < 1) continue;
            var boletin = linea[..indice].Trim();
            try { _ = LectorFichaSenado.NumeroParaConsulta(boletin); }
            catch (ArgumentException ex) { throw new InvalidDataException($"Boletín inválido en el catálogo: {boletin}.", ex); }
            boletines.Add(boletin);
        }
        foreach (var boletin in await db.Proyectos.AsNoTracking().Select(x => x.Boletin).ToListAsync(ct).ConfigureAwait(false))
            boletines.Add(boletin);
        if (boletines.Count < opciones.Value.MinimoBoletines)
            throw new InvalidDataException($"El catálogo tiene {boletines.Count} boletines; se requieren al menos {opciones.Value.MinimoBoletines}.");
        return boletines.OrderByDescending(LectorFichaSenado.NumeroParaConsulta).ToList();
    }
}
