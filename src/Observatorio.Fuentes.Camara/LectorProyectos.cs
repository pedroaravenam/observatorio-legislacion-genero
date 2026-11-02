using System.Globalization;
using System.Net;
using System.Xml;
using System.Xml.Linq;

namespace Observatorio.Fuentes.Camara;

/// <summary>Proyecto de ley tal como lo describe la fuente, ya interpretado pero sin reglas del modelo canónico.</summary>
public sealed record ProyectoFuente(
    string IdOrigen,
    string Boletin,
    string Titulo,
    DateOnly FechaIngreso,
    int TipoIniciativaCodigo,
    string TipoIniciativaNombre,
    int CamaraOrigenCodigo,
    string CamaraOrigenNombre,
    bool? Admisible);

/// <summary>Autor parlamentario de un proyecto, tal como lo entrega la fuente.</summary>
/// <param name="CamaraCodigo">1 si la fuente lo informa como diputado, 2 si como senador (mismos códigos que CamaraOrigen).</param>
/// <param name="Posicion">Posición en la lista de la fuente, desde 0. El campo Orden de la fuente llega siempre en 0.</param>
public sealed record AutorFuente(int CamaraCodigo, string IdOrigen, string Nombre, string ApellidoPaterno, string? ApellidoMaterno, int Posicion);

/// <summary>Detalle de un proyecto (retornarProyectoLey).</summary>
public sealed record DetalleProyectoFuente(ProyectoFuente Proyecto, IReadOnlyList<AutorFuente> Autores);

/// <summary>
/// Interpreta las respuestas SOAP de WSLegislativo (retornarMocionesXAnno, retornarMensajesXAnno).
/// Falla de forma explícita si la respuesta no tiene la forma esperada: un cambio de contrato
/// tiene que verse, no traducirse en una lista vacía.
/// </summary>
public static class LectorProyectos
{
    private static readonly XNamespace Soap = "http://schemas.xmlsoap.org/soap/envelope/";
    private static readonly XNamespace Ns = ClienteSoapCamara.EspacioNombres;

    public static IReadOnlyList<ProyectoFuente> LeerLista(byte[] contenido, string operacion) =>
        ExtraerResultado(contenido, operacion).Elements(Ns + "ProyectoLey").Select(LeerProyecto).ToList();

    public const int CodigoDiputados = 1;
    public const int CodigoSenado = 2;

    /// <summary>
    /// Lee el detalle de un proyecto. Devuelve null si la fuente no lo conoce: para un boletín
    /// inexistente responde 200 con el elemento de respuesta vacío.
    /// </summary>
    public static DetalleProyectoFuente? LeerDetalle(byte[] contenido)
    {
        const string operacion = "retornarProyectoLey";
        var resultado = ExtraerResultado(contenido, operacion);
        if (!resultado.HasElements) return null;

        var autores = new List<AutorFuente>();
        var posicion = 0;
        foreach (var autor in resultado.Element(Ns + "Autores")?.Elements(Ns + "ParlamentarioAutor") ?? [])
        {
            var (persona, camara) = autor.Element(Ns + "Diputado") is { } d ? (d, CodigoDiputados)
                : autor.Element(Ns + "Senador") is { } se ? (se, CodigoSenado)
                : throw new ContratoFuenteException("ParlamentarioAutor sin Diputado ni Senador.");
            var materno = (string?)persona.Element(Ns + "ApellidoMaterno");
            autores.Add(new AutorFuente(
                camara,
                Requerido(persona, "Id").Value.Trim(),
                LimpiarTexto(Requerido(persona, "Nombre").Value),
                LimpiarTexto(Requerido(persona, "ApellidoPaterno").Value),
                string.IsNullOrWhiteSpace(materno) ? null : LimpiarTexto(materno),
                posicion++));
        }
        return new DetalleProyectoFuente(LeerProyecto(resultado), autores);
    }

    /// <summary>Devuelve el elemento {operacion}Result del sobre, o lanza si no existe o hay un Fault.</summary>
    public static XElement ExtraerResultado(byte[] contenido, string operacion)
    {
        XDocument doc;
        using (var flujo = new MemoryStream(contenido))
        {
            doc = XDocument.Load(flujo);
        }
        var cuerpo = doc.Root?.Element(Soap + "Body")
            ?? throw new ContratoFuenteException("La respuesta no es un sobre SOAP: falta soap:Body.");
        var falla = cuerpo.Element(Soap + "Fault");
        if (falla is not null)
        {
            throw new ContratoFuenteException($"La fuente respondió un SOAP Fault: {(string?)falla.Element("faultstring")}");
        }
        var respuesta = cuerpo.Element(Ns + $"{operacion}Response")
            ?? throw new ContratoFuenteException($"Falta el elemento {operacion}Response.");
        // Un resultado vacío llega como elemento vacío o ausente: lista sin proyectos, o proyecto inexistente.
        return respuesta.Element(Ns + $"{operacion}Result") ?? new XElement(Ns + $"{operacion}Result");
    }

    private static ProyectoFuente LeerProyecto(XElement e)
    {
        var tipo = Requerido(e, "TipoIniciativa");
        var camara = Requerido(e, "CamaraOrigen");
        var admisible = (string?)e.Element(Ns + "Admisible");
        return new ProyectoFuente(
            IdOrigen: Requerido(e, "Id").Value.Trim(),
            Boletin: Requerido(e, "NumeroBoletin").Value.Trim(),
            Titulo: LimpiarTexto(Requerido(e, "Nombre").Value),
            FechaIngreso: DateOnly.FromDateTime(DateTime.Parse(Requerido(e, "FechaIngreso").Value, CultureInfo.InvariantCulture)),
            TipoIniciativaCodigo: Codigo(tipo),
            TipoIniciativaNombre: tipo.Value.Trim(),
            CamaraOrigenCodigo: Codigo(camara),
            CamaraOrigenNombre: camara.Value.Trim(),
            Admisible: string.IsNullOrWhiteSpace(admisible) ? null : XmlConvert.ToBoolean(admisible.Trim()));
    }

    private static XElement Requerido(XElement padre, string nombre) =>
        padre.Element(Ns + nombre)
        ?? throw new ContratoFuenteException($"{padre.Name.LocalName} sin elemento {nombre} (Id={(string?)padre.Element(Ns + "Id") ?? "?"}).");

    private static int Codigo(XElement e) =>
        int.TryParse((string?)e.Attribute("Valor"), NumberStyles.None, CultureInfo.InvariantCulture, out var codigo)
            ? codigo
            : throw new ContratoFuenteException($"{e.Name.LocalName} sin atributo Valor numérico.");

    /// <summary>
    /// La fuente escapa dos veces algunas entidades (llega "&amp;quot;" dentro del XML).
    /// Se decodifica una vez más y se normalizan los espacios.
    /// </summary>
    internal static string LimpiarTexto(string texto) =>
        string.Join(' ', WebUtility.HtmlDecode(texto).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}

public sealed class ContratoFuenteException : Exception
{
    public ContratoFuenteException(string mensaje) : base(mensaje) { }
    public ContratoFuenteException(string mensaje, Exception interna) : base(mensaje, interna) { }
    public ContratoFuenteException() { }
}
