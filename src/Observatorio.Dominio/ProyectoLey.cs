namespace Observatorio.Dominio;

/// <summary>Proyecto de ley en el modelo canónico.</summary>
public class ProyectoLey
{
    public long Id { get; set; }
    /// <summary>Número de boletín, p. ej. "17641-13". Es la clave natural entre fuentes.</summary>
    public required string Boletin { get; set; }
    public required string Titulo { get; set; }
    public DateOnly FechaIngreso { get; set; }
    public int TipoIniciativaId { get; set; }
    public TipoIniciativa? TipoIniciativa { get; set; }
    public int CamaraOrigenId { get; set; }
    public Camara? CamaraOrigen { get; set; }
    public bool? Admisible { get; set; }

    // Procedencia: de dónde vino el dato y cuándo se consultó.
    public required string Fuente { get; set; }
    public required string IdOrigen { get; set; }
    public long RespuestaCrudaId { get; set; }
    public DateTimeOffset FechaConsulta { get; set; }
    /// <summary>Huella de los campos normalizados; permite saber si el registro cambió sin comparar campo a campo.</summary>
    public required string HashContenido { get; set; }
    public DateTimeOffset Creado { get; set; }
    public DateTimeOffset Actualizado { get; set; }
    public List<ProyectoAutor> Autores { get; } = [];

    /// <summary>Campos de la ficha del Senado, sin reemplazar la procedencia de la Cámara.</summary>
    public string? EstadoSenado { get; set; }
    public string? EtapaSenado { get; set; }
    public string? SubetapaSenado { get; set; }
    public long? RespuestaSenadoId { get; set; }
    public DateTimeOffset? FechaConsultaSenado { get; set; }
    public string? HashSenado { get; set; }
    public List<TramiteSenado> TramitesSenado { get; } = [];
    public List<ObservacionTramiteSenado> ObservacionesSenado { get; } = [];
}

/// <summary>Trámite del Senado; su posición es la única clave disponible en la ficha.</summary>
public class TramiteSenado
{
    public long Id { get; set; }
    public long ProyectoId { get; set; }
    public int Posicion { get; set; }
    public DateOnly? Fecha { get; set; }
    public required string Sesion { get; set; }
    public required string Descripcion { get; set; }
    public required string Etapa { get; set; }
    public required string Camara { get; set; }
    public long RespuestaCrudaId { get; set; }
}

/// <summary>Tipo de iniciativa (Mensaje, Moción). El código es el que entrega la fuente.</summary>
public class TipoIniciativa
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
}

/// <summary>Cámara del Congreso. El código es el que entrega la fuente.</summary>
public class Camara
{
    public int Id { get; set; }
    public required string Nombre { get; set; }
}

/// <summary>Diputado o senador. La clave natural es (fuente, cámara, id de origen).</summary>
public class Parlamentario
{
    public long Id { get; set; }
    public required string Fuente { get; set; }
    public int CamaraId { get; set; }
    public Camara? Camara { get; set; }
    public required string IdOrigen { get; set; }
    public required string Nombre { get; set; }
    public required string ApellidoPaterno { get; set; }
    public string? ApellidoMaterno { get; set; }
    public DateTimeOffset Creado { get; set; }
    public DateTimeOffset Actualizado { get; set; }
}

/// <summary>Autoría de un proyecto, con el orden que entrega la fuente.</summary>
public class ProyectoAutor
{
    public long ProyectoId { get; set; }
    public long ParlamentarioId { get; set; }
    public Parlamentario? Parlamentario { get; set; }
    public int Orden { get; set; }
    public long RespuestaCrudaId { get; set; }
}
