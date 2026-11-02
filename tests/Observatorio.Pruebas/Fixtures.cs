namespace Observatorio.Pruebas;

internal static class Fixtures
{
    /// <summary>Respuestas reales de opendata.camara.cl obtenidas por el workflow "Sondeo de fuente".</summary>
    public static byte[] Camara(string archivo) =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Fixtures", "camara", archivo));

    /// <summary>Ficha real de tramitacion.senado.cl guardada para probar la integración.</summary>
    public static byte[] Senado(string archivo) =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Fixtures", "senado", archivo));
}
