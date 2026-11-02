using System.Net.Http.Headers;
using System.Security;
using System.Text;
using System.Xml;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Observatorio.Fuentes.Camara;

/// <summary>
/// Cliente SOAP 1.1 de los servicios de opendata.camara.cl.
/// Devuelve la respuesta en bytes, sin interpretarla: la capa de ingesta cruda la guarda
/// tal como llegó. Ver la decisión 0005 sobre por qué no se usa un proxy generado.
/// </summary>
public sealed partial class ClienteSoapCamara(HttpClient http, IOptions<OpcionesCamara> opciones, TimeProvider reloj, ILogger<ClienteSoapCamara> log)
{
    public const string EspacioNombres = "http://opendata.camara.cl/camaradiputados/v1";

    private readonly OpcionesCamara _opciones = opciones.Value;

    public async Task<RespuestaFuente> ConsultarAsync(
        string servicio, string operacion, IReadOnlyList<KeyValuePair<string, string>> parametros, CancellationToken ct)
    {
        var url = new Uri(new Uri(_opciones.UrlBase), $"{servicio}.asmx");
        var sobre = ArmarSobre(operacion, parametros);
        var parametrosCanonicos = string.Join("&", parametros.OrderBy(p => p.Key, StringComparer.Ordinal).Select(p => $"{p.Key}={p.Value}"));

        for (var intento = 1; ; intento++)
        {
            var fecha = reloj.GetUtcNow();
            try
            {
                using var solicitud = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new StringContent(sobre, Encoding.UTF8, "text/xml"),
                };
                solicitud.Headers.Add("SOAPAction", $"\"{EspacioNombres}/{operacion}\"");
                solicitud.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/xml"));

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(_opciones.TiempoEspera);
                using var respuesta = await http.SendAsync(solicitud, cts.Token).ConfigureAwait(false);
                var contenido = await respuesta.Content.ReadAsByteArrayAsync(cts.Token).ConfigureAwait(false);

                if (!respuesta.IsSuccessStatusCode)
                {
                    throw new FuenteNoDisponibleException($"{servicio}.{operacion} respondió HTTP {(int)respuesta.StatusCode}.");
                }
                ValidarSobre(contenido, operacion);

                return new RespuestaFuente(servicio, operacion, parametrosCanonicos, url.ToString(), fecha, (int)respuesta.StatusCode, contenido);
            }
            catch (Exception ex) when (EsReintentable(ex, ct) && intento < _opciones.Intentos)
            {
                var espera = _opciones.EsperaEntreIntentos * intento;
                LogReintento(log, servicio, operacion, intento, _opciones.Intentos, espera, ex.Message);
                await Task.Delay(espera, reloj, ct).ConfigureAwait(false);
            }
            catch (Exception ex) when (EsReintentable(ex, ct))
            {
                throw new FuenteNoDisponibleException($"{servicio}.{operacion} falló tras {intento} intentos: {ex.Message}", ex);
            }
        }
    }

    private static bool EsReintentable(Exception ex, CancellationToken ct) =>
        !ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException or FuenteNoDisponibleException or XmlException or ContratoFuenteException;

    internal static string ArmarSobre(string operacion, IEnumerable<KeyValuePair<string, string>> parametros)
    {
        var cuerpo = new StringBuilder();
        foreach (var (clave, valor) in parametros)
        {
            cuerpo.Append('<').Append(clave).Append('>').Append(SecurityElement.Escape(valor)).Append("</").Append(clave).Append('>');
        }
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
            + "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Body>"
            + $"<{operacion} xmlns=\"{EspacioNombres}\">{cuerpo}</{operacion}>"
            + "</soap:Body></soap:Envelope>";
    }

    /// <summary>
    /// Una respuesta 200 no garantiza una respuesta útil: se exige un sobre SOAP bien formado,
    /// sin Fault y con el elemento de respuesta de la operación pedida.
    /// </summary>
    internal static void ValidarSobre(byte[] contenido, string operacion) =>
        _ = LectorProyectos.ExtraerResultado(contenido, operacion);

    [LoggerMessage(Level = LogLevel.Warning, Message = "{Servicio}.{Operacion}: intento {Intento} de {Total} falló ({Motivo}); se reintenta en {Espera}.")]
    private static partial void LogReintento(ILogger log, string servicio, string operacion, int intento, int total, TimeSpan espera, string motivo);
}

public sealed class FuenteNoDisponibleException : Exception
{
    public FuenteNoDisponibleException(string mensaje) : base(mensaje) { }
    public FuenteNoDisponibleException(string mensaje, Exception interna) : base(mensaje, interna) { }
    public FuenteNoDisponibleException() { }
}
