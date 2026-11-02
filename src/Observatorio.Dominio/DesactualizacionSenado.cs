namespace Observatorio.Dominio;

/// <summary>Primera observación de una versión de trámite. La huella no depende de la posición.</summary>
public class ObservacionTramiteSenado
{
    public long Id { get; set; }
    public long ProyectoId { get; set; }
    public required string Huella { get; set; }
    public DateOnly? FechaTramite { get; set; }
    public DateTimeOffset PrimeraVista { get; set; }
    /// <summary>Nulo si falta la fecha o es anómala; un valor negativo pequeño indica fecha futura.</summary>
    public int? RetrasoDias { get; set; }
    public required string Origen { get; set; }
    public long RespuestaCrudaId { get; set; }
}

/// <summary>Cambio encontrado por la carga completa que no estaba en los datos canónicos.</summary>
public class DesactualizacionSenado
{
    public long Id { get; set; }
    public long ProyectoId { get; set; }
    public ProyectoLey? Proyecto { get; set; }
    public long EjecucionId { get; set; }
    public long RespuestaCrudaId { get; set; }
    public DateTimeOffset Detectado { get; set; }
    /// <summary>Última confirmación conocida: carga completa previa u observación posterior de la ficha.</summary>
    public DateTimeOffset UltimaConfirmacion { get; set; }
    public int Insertados { get; set; }
    public int Actualizados { get; set; }
    public string? HashAnterior { get; set; }
    public string? HashActual { get; set; }
}

/// <summary>Resumen operativo de frescura de una fuente.</summary>
public class FuenteEstado
{
    public required string Fuente { get; set; }
    public required string Estado { get; set; }
    public DateTimeOffset? UltimaDiaria { get; set; }
    public DateTimeOffset? UltimaCompleta { get; set; }
    public DateTimeOffset? UltimaRespuesta { get; set; }
    public string? UltimoError { get; set; }
    public DateTimeOffset Actualizado { get; set; }
}
