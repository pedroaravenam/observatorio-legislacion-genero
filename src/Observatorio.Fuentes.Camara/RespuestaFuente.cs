namespace Observatorio.Fuentes.Camara;

/// <summary>Respuesta de una operación tal como llegó, antes de cualquier interpretación.</summary>
public sealed record RespuestaFuente(
    string Servicio,
    string Operacion,
    string Parametros,
    string Url,
    DateTimeOffset FechaConsulta,
    int EstadoHttp,
    byte[] Contenido);
