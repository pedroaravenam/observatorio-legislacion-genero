using System.Globalization;
using System.Text;

namespace Observatorio.Ingesta;

/// <summary>Persona de una lista de referencia (diputados de la Cámara o reseñas de la BCN) para enlazar autores.</summary>
public sealed record PersonaReferencia(
    long Id, char? Sexo, IReadOnlyList<string> Nombre, IReadOnlyList<string> ApellidoPaterno,
    IReadOnlyList<string> ApellidoMaterno, string? Url);

public sealed record ResolucionAutor(long? ParlamentarioId, char? Sexo, string Metodo, string? Url);

/// <summary>
/// Enlaza el nombre de un autor, tal como lo escribe el Senado («Apellidos, Nombres»), con una persona de las listas de
/// referencia. Exige que los apellidos coincidan completos y que el nombre con que firma el Senado sea uno de los nombres
/// de pila de la persona («Soledad» para «María Soledad»); no hace coincidencias aproximadas, porque un sexo equivocado
/// es peor que uno desconocido.
/// </summary>
public static class ResolutorAutores
{
    public const string MetodoCamara = "camara_nombre";
    public const string MetodoBcn = "bcn_nombre";
    public const string MetodoManual = "manual";
    public const string MetodoAmbiguo = "ambiguo_mismo_sexo";
    public const string MetodoSinDato = "sin_dato";

    /// <summary>Minúsculas, sin tildes ni signos, en palabras: «Ñanco» y «nanco» son iguales, y «Ruiz-Esquide» son dos palabras.</summary>
    public static string[] Palabras(string? texto)
    {
        if (string.IsNullOrWhiteSpace(texto)) return [];
        var descompuesto = texto.Normalize(NormalizationForm.FormD);
        var limpio = new StringBuilder(descompuesto.Length);
        foreach (var c in descompuesto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            limpio.Append(char.IsLetter(c) ? char.ToLowerInvariant(c) : ' ');
        }
        return limpio.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries);
    }

    public static ResolucionAutor Resolver(
        string texto, IReadOnlyList<PersonaReferencia> camara, IReadOnlyList<PersonaReferencia> bcn,
        IReadOnlyDictionary<string, PersonaReferencia> manuales)
    {
        if (manuales.TryGetValue(texto, out var manual))
            return new ResolucionAutor(manual.Id, manual.Sexo, MetodoManual, manual.Url);

        var coma = texto.IndexOf(',', StringComparison.Ordinal);
        if (coma <= 0) return new ResolucionAutor(null, null, MetodoSinDato, null);
        var apellidos = Palabras(texto[..coma]);
        var nombres = Palabras(texto[(coma + 1)..]);
        if (apellidos.Length == 0 || nombres.Length == 0) return new ResolucionAutor(null, null, MetodoSinDato, null);

        var enBcn = Buscar(bcn, apellidos, nombres);
        var enCamara = Buscar(camara, apellidos, nombres);
        // La reseña de la BCN aporta el enlace a la ficha cuando la persona se identifica sin ambigüedad.
        var url = enBcn.Count == 1 ? enBcn[0].Url : null;

        if (enCamara.Count == 1) return new ResolucionAutor(enCamara[0].Id, enCamara[0].Sexo, MetodoCamara, url);
        if (enCamara.Count > 1) return Ambiguo(enCamara);
        if (enBcn.Count == 1) return new ResolucionAutor(enBcn[0].Id, enBcn[0].Sexo, MetodoBcn, url);
        if (enBcn.Count > 1) return Ambiguo(enBcn);
        return new ResolucionAutor(null, null, MetodoSinDato, null);
    }

    private static ResolucionAutor Ambiguo(List<PersonaReferencia> candidatos)
    {
        var sexos = candidatos.Select(x => x.Sexo).Distinct().ToList();
        return sexos is [{ } unico]
            ? new ResolucionAutor(null, unico, MetodoAmbiguo, null)
            : new ResolucionAutor(null, null, MetodoSinDato, null);
    }

    private static List<PersonaReferencia> Buscar(
        IReadOnlyList<PersonaReferencia> lista, string[] apellidos, string[] nombres) =>
        lista.Where(p => p.Nombre.Contains(nombres[0]) && CoincidenApellidos(p, apellidos)).ToList();

    private static bool CoincidenApellidos(PersonaReferencia p, string[] apellidos)
    {
        // Paterno y materno juntos, o solo el paterno cuando la fuente no trae materno.
        var completo = p.ApellidoPaterno.Concat(p.ApellidoMaterno);
        return completo.SequenceEqual(apellidos);
    }
}
