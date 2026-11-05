using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;

namespace Observatorio.Ingesta;

/// <summary>Consulta una ficha del Senado, guarda sus bytes y normaliza su estado y sus trámites.</summary>
public sealed class IngestaFichaSenado(
    ClienteSenado cliente,
    ObservatorioDbContext db,
    NormalizadorSenado normalizador,
    TimeProvider reloj)
{
    public const string Proceso = "senado.ficha";
    private static readonly UTF8Encoding Utf8Estricto = new(false, true);

    public async Task<EjecucionIngesta> EjecutarAsync(string boletin, CancellationToken ct,
        string origen = "ficha", ContextoCargaSenado? contextoCarga = null)
    {
        _ = LectorFichaSenado.NumeroParaConsulta(boletin);
        var parametros = $"boletin={boletin}";
        var ejecucion = new EjecucionIngesta
        {
            Proceso = Proceso,
            Parametros = parametros,
            EjecucionPadreId = contextoCarga?.EjecucionId,
            Inicio = reloj.GetUtcNow(),
            Estado = EstadoEjecucion.EnCurso,
        };
        db.Ejecuciones.Add(ejecucion);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);

        try
        {
            var respuesta = await cliente.ConsultarAsync(boletin, ct).ConfigureAwait(false);
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

            if (LectorFichaSenado.EsSinDato(respuesta.Contenido))
            {
                var yaCargado = await db.Proyectos.AsNoTracking().AnyAsync(
                    x => x.Boletin == boletin && x.HashSenado != null, ct).ConfigureAwait(false);
                if (yaCargado)
                    throw new FuenteSenadoException($"El Senado dejó de devolver el boletín {boletin}; se conserva la ficha anterior.");
                ejecucion.Detalle = "sin_dato";
            }
            else
            {
                var resultado = await normalizador.NormalizarAsync(cruda, boletin, ct, origen, contextoCarga, respuesta.FechaConsulta).ConfigureAwait(false);
                ejecucion.RegistrosInsertados = resultado.Insertados;
                ejecucion.RegistrosActualizados = resultado.Actualizados;
                ejecucion.RegistrosSinCambio = resultado.SinCambio;
            }
            ejecucion.Estado = EstadoEjecucion.Exitosa;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            db.ChangeTracker.Clear();
            ejecucion.Estado = EstadoEjecucion.Fallida;
            ejecucion.Detalle = ex.Message.Length <= 4000 ? ex.Message : ex.Message[..4000];
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
}
