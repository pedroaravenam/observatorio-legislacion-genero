using System.Xml.Linq;

namespace Observatorio.Fuentes.Camara;

/// <summary>Diputado tal como lo entrega WSDiputado. No se leen RUT ni fecha de nacimiento: nada del Observatorio los necesita.</summary>
public sealed record DiputadoFuente(string Id, string Nombre, string ApellidoPaterno, string? ApellidoMaterno, char? Sexo);

/// <summary>Lee la respuesta de <c>WSDiputado.retornarDiputados</c>.</summary>
public static class LectorDiputados
{
    public const string Servicio = "WSDiputado";
    public const string Operacion = "retornarDiputados";
    private static readonly XNamespace Ns = ClienteSoapCamara.EspacioNombres;

    public static IReadOnlyList<DiputadoFuente> Leer(byte[] contenido)
    {
        var resultado = LectorProyectos.ExtraerResultado(contenido, Operacion);
        var diputados = new List<DiputadoFuente>();
        foreach (var d in resultado.Elements(Ns + "Diputado"))
        {
            var id = Texto(d, "Id");
            var apellido = Texto(d, "ApellidoPaterno");
            var nombre = string.Join(' ', new[] { Texto(d, "Nombre"), Texto(d, "Nombre2") }.Where(x => x.Length > 0));
            // El servicio incluye un registro sin nombre ni apellido (Id 9999) que no corresponde a una persona.
            if (id.Length == 0 || apellido.Length == 0 || nombre.Length == 0) continue;
            var materno = Texto(d, "ApellidoMaterno");
            var sexo = d.Element(Ns + "Sexo")?.Value.Trim() switch { "Femenino" => 'F', "Masculino" => 'M', _ => (char?)null };
            diputados.Add(new DiputadoFuente(id, nombre, apellido, materno.Length == 0 ? null : materno, sexo));
        }
        if (diputados.Count == 0)
            throw new ContratoFuenteException("retornarDiputados no trajo ningún diputado.");
        return diputados;
    }

    private static string Texto(XElement padre, string nombre) => padre.Element(Ns + nombre)?.Value.Trim() ?? "";
}
