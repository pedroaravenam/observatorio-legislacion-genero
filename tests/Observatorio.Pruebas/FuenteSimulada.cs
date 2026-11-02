using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Pruebas;

/// <summary>Responde según la SOAPAction con el contenido que se le indique. Registra las llamadas.</summary>
internal sealed class FuenteSimulada : HttpMessageHandler
{
    public Dictionary<string, Func<HttpResponseMessage>> Respuestas { get; } = new(StringComparer.Ordinal);

    /// <summary>Detalle por boletín. Un boletín sin entrada recibe la respuesta vacía, como hace la fuente real.</summary>
    public Dictionary<string, Func<HttpResponseMessage>> Detalles { get; } = new(StringComparer.Ordinal);

    public System.Collections.Concurrent.ConcurrentQueue<string> Llamadas { get; } = new();

    public static FuenteSimulada ConFixtures2025()
    {
        var f = new FuenteSimulada();
        f.Responder("retornarMocionesXAnno", Fixtures.Camara("retornarMocionesXAnno-2025.xml"));
        f.Responder("retornarMensajesXAnno", Fixtures.Camara("retornarMensajesXAnno-2025.xml"));
        foreach (var b in BoletinesConDetalle) f.ResponderDetalle(b, Fixtures.Camara($"retornarProyectoLey-{b}.xml"));
        return f;
    }

    /// <summary>Mociones de 2025 cuyo detalle real está en los fixtures.</summary>
    public static readonly string[] BoletinesConDetalle = ["17353-07", "17348-37", "17776-16"];

    public void ResponderDetalle(string boletin, byte[] contenido) =>
        Detalles[boletin] = () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(contenido) };

    public void Responder(string operacion, byte[] contenido) =>
        Respuestas[operacion] = () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(contenido) };

    public void Responder(string operacion, string contenido) => Responder(operacion, Encoding.UTF8.GetBytes(contenido));

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var accion = request.Headers.GetValues("SOAPAction").Single().Trim('"');
        var operacion = accion[(accion.LastIndexOf('/') + 1)..];
        if (operacion == "retornarProyectoLey")
        {
            var cuerpo = await request.Content!.ReadAsStringAsync(cancellationToken);
            var boletin = Regex.Match(cuerpo, "<prmNumeroBoletin>([^<]*)</prmNumeroBoletin>").Groups[1].Value;
            Llamadas.Enqueue($"{operacion}:{boletin}");
            return Detalles.TryGetValue(boletin, out var d) ? d()
                : new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Fixtures.Camara("retornarProyectoLey-99999-99.xml")) };
        }
        Llamadas.Enqueue(operacion);
        return Respuestas.TryGetValue(operacion, out var r) ? r() : new HttpResponseMessage(HttpStatusCode.NotFound);
    }

    public ClienteSoapCamara Cliente() => new(
        new HttpClient(this, disposeHandler: false),
        Options.Create(new OpcionesCamara { Intentos = 2, EsperaEntreIntentos = TimeSpan.Zero }),
        TimeProvider.System,
        NullLogger<ClienteSoapCamara>.Instance);
}
