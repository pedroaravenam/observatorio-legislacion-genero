namespace Observatorio.Fuentes.Senado;

public sealed class OpcionesSenado
{
    public const string Seccion = "Fuentes:Senado";

    public string UrlServicio { get; set; } = "https://tramitacion.senado.cl/wspublico/tramitacion.php";
    public TimeSpan TiempoEspera { get; set; } = TimeSpan.FromSeconds(120);
    public int Intentos { get; set; } = 3;
    public TimeSpan EsperaEntreIntentos { get; set; } = TimeSpan.FromSeconds(2);
}
