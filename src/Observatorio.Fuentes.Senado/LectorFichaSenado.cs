using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace Observatorio.Fuentes.Senado;

public sealed record TramiteFuenteSenado(int Posicion, DateOnly? Fecha, string Sesion, string Descripcion, string Etapa, string Camara);
public sealed record FichaFuenteSenado(
    string Boletin, string Titulo, DateOnly FechaIngreso, int TipoIniciativaCodigo,
    int CamaraOrigenCodigo, string Estado, string Etapa, string Subetapa,
    IReadOnlyList<TramiteFuenteSenado> Tramites);

public static partial class LectorFichaSenado
{
    [GeneratedRegex(@"^([1-9][0-9]*)-[0-9]{2}$", RegexOptions.CultureInvariant)]
    private static partial Regex FormatoBoletin();

    public static int NumeroParaConsulta(string boletin)
    {
        var match = FormatoBoletin().Match(boletin);
        if (!match.Success || !int.TryParse(match.Groups[1].Value, CultureInfo.InvariantCulture, out var numero))
            throw new ArgumentException("El boletín debe tener el formato número-dígito, por ejemplo 17641-13.", nameof(boletin));
        return numero;
    }

    /// <summary>Ausencia conocida del boletín; no equivale a un error HTML genérico.</summary>
    public static bool EsSinDato(byte[] contenido)
    {
        var texto = System.Text.Encoding.UTF8.GetString(contenido).Trim();
        return texto is "<proyectos></proyectos>" or "<proyectos/>" or "<proyectos />" ||
            texto.StartsWith("<div", StringComparison.OrdinalIgnoreCase) &&
            texto.Contains("No existe el n&uacute;mero de bolet&iacute;n solicitado", StringComparison.OrdinalIgnoreCase);
    }

    public static FichaFuenteSenado Leer(byte[] contenido, string boletinEsperado,
        bool permitirSinTramites = false)
    {
        var fichas = LeerLote(contenido, permitirSinTramites);
        if (fichas.Count != 1)
            throw new FuenteSenadoException($"La respuesta de {boletinEsperado} no contiene una ficha única del Senado.");
        var ficha = fichas[0];
        if (!string.Equals(ficha.Boletin, boletinEsperado, StringComparison.Ordinal))
            throw new FuenteSenadoException($"Se pidió {boletinEsperado}, pero el Senado devolvió {ficha.Boletin}.");
        return ficha;
    }

    public static IReadOnlyList<FichaFuenteSenado> LeerLote(byte[] contenido, bool permitirSinTramites = false)
    {
        ArgumentNullException.ThrowIfNull(contenido);
        using var entrada = new MemoryStream(contenido, writable: false);
        using var lector = XmlReader.Create(entrada, new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null });
        XDocument xml;
        try { xml = XDocument.Load(lector); }
        catch (XmlException ex) { throw new FuenteSenadoException("La ficha del Senado no es XML válido.", ex); }

        var proyectos = xml.Root?.Name.LocalName == "proyectos"
            ? xml.Root.Elements().Where(x => x.Name.LocalName == "proyecto").ToList()
            : new List<XElement>();
        if (proyectos.Count == 0)
            throw new FuenteSenadoException("La respuesta del Senado no contiene fichas.");
        var fichas = proyectos.Select(x => LeerProyecto(x, permitirSinTramites)).ToList();
        if (fichas.Select(x => x.Boletin).Distinct(StringComparer.Ordinal).Count() != fichas.Count)
            throw new FuenteSenadoException("La respuesta del Senado contiene boletines repetidos.");
        return fichas;
    }

    private static FichaFuenteSenado LeerProyecto(XElement proyecto, bool permitirSinTramites)
    {
        var descripcion = proyecto.Element("descripcion")
            ?? throw new FuenteSenadoException("Una ficha del Senado no tiene descripción.");
        var boletin = Valor(descripcion, "boletin");
        try { _ = NumeroParaConsulta(boletin); }
        catch (ArgumentException ex) { throw new FuenteSenadoException("Una ficha del Senado tiene un boletín inválido.", ex); }
        var titulo = Valor(descripcion, "titulo");
        var estado = Valor(descripcion, "estado");
        if (titulo.Length == 0 || estado.Length == 0)
            throw new FuenteSenadoException($"La ficha de {boletin} no tiene título o estado.");
        var fechaIngreso = Fecha(descripcion, "fecha_ingreso")
            ?? throw new FuenteSenadoException($"La ficha de {boletin} no tiene fecha de ingreso.");
        var tipo = Valor(descripcion, "iniciativa") switch
        {
            "Mensaje" => 1,
            "Moción" => 2,
            _ => throw new FuenteSenadoException($"La ficha de {boletin} tiene un tipo de iniciativa desconocido."),
        };
        var camara = Valor(descripcion, "camara_origen") switch
        {
            "C.Diputados" => 1,
            "Senado" => 2,
            _ => throw new FuenteSenadoException($"La ficha de {boletin} tiene una cámara de origen desconocida."),
        };
        var tramitacion = proyecto.Element("tramitacion");
        if (tramitacion is null || !permitirSinTramites && !tramitacion.Elements("tramite").Any())
            throw new FuenteSenadoException($"La ficha de {boletin} no tiene trámites; se conserva lo ya cargado.");

        var tramites = tramitacion.Elements("tramite")
            .Select((x, indice) => new TramiteFuenteSenado(
                indice + 1,
                Fecha(x, "FECHA"),
                Valor(x, "SESION"),
                Valor(x, "DESCRIPCIONTRAMITE"),
                Valor(x, "ETAPDESCRIPCION"),
                Valor(x, "CAMARATRAMITE")))
            .ToList();

        return new FichaFuenteSenado(boletin, titulo, fechaIngreso, tipo, camara, estado,
            Valor(descripcion, "etapa"), Valor(descripcion, "subetapa"), tramites);
    }

    private static string Valor(XElement elemento, string nombre) => (elemento.Element(nombre)?.Value ?? "").Trim();

    private static DateOnly? Fecha(XElement elemento, string nombre)
    {
        var valor = Valor(elemento, nombre);
        if (valor.Length == 0 || valor == "/") return null;
        if (!DateOnly.TryParseExact(valor, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fecha))
            throw new FuenteSenadoException($"Fecha de trámite inválida: {valor}.");
        return fecha;
    }
}
