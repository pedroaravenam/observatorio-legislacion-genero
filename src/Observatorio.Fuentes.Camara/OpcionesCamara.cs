namespace Observatorio.Fuentes.Camara;

public class OpcionesCamara
{
    public const string Seccion = "Fuentes:Camara";

    /// <summary>Base de los servicios de datos abiertos de la Cámara.</summary>
    public string UrlBase { get; set; } = "https://opendata.camara.cl/camaradiputados/WServices/";

    /// <summary>Tiempo máximo por consulta. Las listas anuales pesan cientos de KB.</summary>
    public TimeSpan TiempoEspera { get; set; } = TimeSpan.FromSeconds(120);

    /// <summary>Intentos totales por consulta ante error de red, HTTP o respuesta inválida.</summary>
    public int Intentos { get; set; } = 3;

    /// <summary>Espera base entre intentos; crece linealmente con cada intento.</summary>
    public TimeSpan EsperaEntreIntentos { get; set; } = TimeSpan.FromSeconds(2);
}
