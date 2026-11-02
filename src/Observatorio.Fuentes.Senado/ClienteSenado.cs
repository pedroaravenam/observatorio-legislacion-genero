using System.Globalization;
using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Observatorio.Fuentes.Senado;

public sealed record RespuestaSenado(string Parametro, string Url, DateTimeOffset FechaConsulta, int EstadoHttp, byte[] Contenido);

public sealed class FuenteSenadoException(string mensaje, Exception? interna = null) : Exception(mensaje, interna);

/// <summary>Consulta una ficha por boletín. Devuelve los bytes antes de interpretarlos.</summary>
public sealed partial class ClienteSenado(HttpClient http, IOptions<OpcionesSenado> opciones, TimeProvider reloj, ILogger<ClienteSenado> log)
{
    public async Task<RespuestaSenado> ConsultarAsync(string boletin, CancellationToken ct)
    {
        var numero = LectorFichaSenado.NumeroParaConsulta(boletin);
        var url = $"{opciones.Value.UrlServicio}?boletin={numero.ToString(CultureInfo.InvariantCulture)}";
        return await ConsultarUrlAsync(boletin, url, ct).ConfigureAwait(false);
    }

    public Task<RespuestaSenado> ConsultarFechaAsync(DateOnly fecha, CancellationToken ct)
    {
        var parametro = $"fecha={fecha.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)}";
        return ConsultarUrlAsync(parametro, $"{opciones.Value.UrlServicio}?{parametro}", ct);
    }

    private async Task<RespuestaSenado> ConsultarUrlAsync(string parametro, string url, CancellationToken ct)
    {
        var intentos = Math.Max(1, opciones.Value.Intentos);

        for (var intento = 1; ; intento++)
        {
            var fecha = reloj.GetUtcNow();
            try
            {
                using var tiempo = CancellationTokenSource.CreateLinkedTokenSource(ct);
                tiempo.CancelAfter(opciones.Value.TiempoEspera);
                using var respuesta = await http.GetAsync(url, tiempo.Token).ConfigureAwait(false);
                var contenido = await respuesta.Content.ReadAsByteArrayAsync(tiempo.Token).ConfigureAwait(false);
                if (!respuesta.IsSuccessStatusCode)
                {
                    if (respuesta.StatusCode == HttpStatusCode.TooManyRequests || (int)respuesta.StatusCode >= 500)
                        throw new HttpRequestException($"El Senado respondió HTTP {(int)respuesta.StatusCode} para {parametro}.");
                    throw new FuenteSenadoException($"El Senado rechazó {parametro} con HTTP {(int)respuesta.StatusCode}.");
                }
                return new RespuestaSenado(parametro, url, fecha, (int)respuesta.StatusCode, contenido);
            }
            catch (Exception ex) when (Reintentable(ex, ct) && intento < intentos)
            {
                var espera = opciones.Value.EsperaEntreIntentos * intento;
                LogReintento(log, ex, parametro, intento, intentos, espera);
                await Task.Delay(espera, reloj, ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (Reintentable(ex, ct))
            {
                throw new FuenteSenadoException($"La consulta del Senado {parametro} falló tras {intento} intentos: {ex.Message}", ex);
            }
        }
    }

    private static bool Reintentable(Exception ex, CancellationToken ct) =>
        !ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException;

    [LoggerMessage(Level = LogLevel.Warning, Message = "Consulta del Senado {Parametro}: intento {Intento} de {Total}; reintento en {Espera}.")]
    private static partial void LogReintento(ILogger log, Exception ex, string parametro, int intento, int total, TimeSpan espera);
}
