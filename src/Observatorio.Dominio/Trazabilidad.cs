namespace Observatorio.Dominio;

/// <summary>
/// Respuesta de una fuente tal como llegó. Es inmutable: no se edita ni se borra,
/// y es la evidencia de procedencia de todo lo que se normaliza a partir de ella.
/// </summary>
public class RespuestaCruda
{
    public long Id { get; set; }
    public required string Fuente { get; set; }
    public required string Operacion { get; set; }
    /// <summary>Parámetros de la consulta en forma canónica (clave=valor ordenados), p. ej. "prmAnno=2025".</summary>
    public required string Parametros { get; set; }
    public required string Url { get; set; }
    public DateTimeOffset FechaConsulta { get; set; }
    public int EstadoHttp { get; set; }
    /// <summary>SHA-256 en hexadecimal del contenido en bytes, tal como llegó.</summary>
    public required string Hash { get; set; }
    public required string Contenido { get; set; }
    public long EjecucionId { get; set; }
}

/// <summary>Registro de cada ejecución de un proceso de ingesta, con su resultado.</summary>
public class EjecucionIngesta
{
    public long Id { get; set; }
    public required string Proceso { get; set; }
    public required string Parametros { get; set; }
    public long? EjecucionPadreId { get; set; }
    public DateTimeOffset Inicio { get; set; }
    public DateTimeOffset? Termino { get; set; }
    public EstadoEjecucion Estado { get; set; }
    public int RespuestasNuevas { get; set; }
    public int RespuestasRepetidas { get; set; }
    public int RegistrosInsertados { get; set; }
    public int RegistrosActualizados { get; set; }
    public int RegistrosSinCambio { get; set; }
    public string? Detalle { get; set; }
}

public enum EstadoEjecucion
{
    EnCurso = 0,
    Exitosa = 1,
    Fallida = 2,
    /// <summary>Las listas se procesaron, pero falló el detalle de algunos proyectos. El campo Detalle dice cuáles.</summary>
    Parcial = 3,
}
