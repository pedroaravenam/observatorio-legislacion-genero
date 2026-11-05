using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;

namespace Observatorio.Ingesta;

/// <summary>Consulta la ventana diaria del Senado y normaliza el lote completo de forma atómica.</summary>
public sealed class IngestaFechaSenado(
    ClienteSenado cliente,
    ObservatorioDbContext db,
    NormalizadorSenado normalizador,
    TimeProvider reloj)
{
    public const string Proceso = "senado.fecha";
    private static readonly UTF8Encoding Utf8Estricto = new(false, true);

    public async Task<EjecucionIngesta> EjecutarAsync(DateOnly hoy, CancellationToken ct)
    {
        var ejecucion = new EjecucionIngesta
        {
            Proceso = Proceso,
            Parametros = $"dia={hoy:yyyy-MM-dd};ventana=21..14",
            Inicio = reloj.GetUtcNow(),
            Estado = EstadoEjecucion.EnCurso,
        };
        db.Ejecuciones.Add(ejecucion);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);

        try
        {
            var hayBase = await db.Ejecuciones.AsNoTracking().AnyAsync(x =>
                (x.Proceso == Proceso || x.Proceso == IngestaCompletaSenado.Proceso) &&
                x.Estado == EstadoEjecucion.Exitosa, ct).ConfigureAwait(false);
            for (var dias = 21; dias >= 14; dias--)
            {
                var fechaDesde = hoy.AddDays(-dias);
                var respuesta = await cliente.ConsultarFechaAsync(fechaDesde, ct).ConfigureAwait(false);
                var parametros = $"fecha={fechaDesde.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)}";
                var hash = Convert.ToHexStringLower(SHA256.HashData(respuesta.Contenido));
                var cruda = await db.RespuestasCrudas.AsNoTracking().SingleOrDefaultAsync(
                    x => x.Fuente == NormalizadorSenado.Fuente && x.Operacion == "tramitacion" &&
                         x.Parametros == parametros && x.Hash == hash, ct).ConfigureAwait(false);
                if (cruda is null)
                {
                    cruda = new RespuestaCruda
                    {
                        Fuente = NormalizadorSenado.Fuente,
                        Operacion = "tramitacion",
                        Parametros = parametros,
                        Url = respuesta.Url,
                        FechaConsulta = respuesta.FechaConsulta,
                        EstadoHttp = respuesta.EstadoHttp,
                        Hash = hash,
                        Contenido = Utf8Estricto.GetString(respuesta.Contenido),
                        EjecucionId = ejecucion.Id,
                    };
                    db.RespuestasCrudas.Add(cruda);
                    await db.SaveChangesAsync(ct).ConfigureAwait(false);
                    ejecucion.RespuestasNuevas++;
                }
                else ejecucion.RespuestasRepetidas++;

                if (cruda.Contenido.TrimStart().StartsWith("<div", StringComparison.OrdinalIgnoreCase) &&
                    cruda.Contenido.Contains("No existe el n", StringComparison.OrdinalIgnoreCase))
                    continue;

                // Leer el lote completo antes de modificar tablas canónicas.
                _ = LectorFichaSenado.LeerLote(respuesta.Contenido);
                var resultado = await normalizador.NormalizarLoteAsync(cruda, ct,
                    hayBase ? "fecha" : "base", respuesta.FechaConsulta).ConfigureAwait(false);
                ejecucion.RegistrosInsertados = resultado.Insertados;
                ejecucion.RegistrosActualizados = resultado.Actualizados;
                ejecucion.RegistrosSinCambio = resultado.SinCambio;
                ejecucion.Parametros = $"dia={hoy:yyyy-MM-dd};fechaDesde={fechaDesde:yyyy-MM-dd};ventana={dias}";
                ejecucion.Estado = EstadoEjecucion.Exitosa;
                break;
            }
            if (ejecucion.Estado != EstadoEjecucion.Exitosa)
                throw new FuenteSenadoException("El Senado rechazó todas las fechas de la ventana mínima de 14 días.");
            await EstadoFuenteSenado.RegistrarAsync(db, Proceso, reloj.GetUtcNow(), null, ct).ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            db.ChangeTracker.Clear();
            ejecucion.Estado = EstadoEjecucion.Fallida;
            ejecucion.Detalle = ex.Message.Length <= 4000 ? ex.Message : ex.Message[..4000];
            db.Ejecuciones.Update(ejecucion);
            await EstadoFuenteSenado.RegistrarAsync(db, Proceso, reloj.GetUtcNow(), ex.Message, CancellationToken.None)
                .ConfigureAwait(false);
            throw;
        }
        finally
        {
            ejecucion.Termino = reloj.GetUtcNow();
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(false);
        }
        return ejecucion;
    }
}
