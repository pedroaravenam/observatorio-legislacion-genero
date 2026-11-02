using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Ingesta;

namespace Observatorio.Pruebas;

internal static class Ingestas
{
    public static IngestaProyectosCamara Crear(ObservatorioDbContext db, FuenteSimulada fuente, bool detalle) => new(
        fuente.Cliente(), db, new NormalizadorProyectos(db, TimeProvider.System),
        Options.Create(new OpcionesIngesta { Detalle = detalle }),
        TimeProvider.System, NullLogger<IngestaProyectosCamara>.Instance);
}
