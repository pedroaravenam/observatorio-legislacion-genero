using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;

namespace Observatorio.Ingesta;

/// <summary>Actualiza el resumen de frescura del Senado después de cada corrida.</summary>
public static class EstadoFuenteSenado
{
    public static async Task RegistrarAsync(
        ObservatorioDbContext db, string proceso, DateTimeOffset ahora, string? error, CancellationToken ct)
    {
        var estado = await db.EstadosFuentes.SingleOrDefaultAsync(x => x.Fuente == "senado", ct)
            .ConfigureAwait(false);
        if (estado is null)
        {
            estado = new FuenteEstado { Fuente = "senado", Estado = "sin_datos", Actualizado = ahora };
            db.EstadosFuentes.Add(estado);
        }
        if (error is null)
        {
            if (proceso == IngestaFechaSenado.Proceso) estado.UltimaDiaria = ahora;
            if (proceso == IngestaCompletaSenado.Proceso) estado.UltimaCompleta = ahora;
            estado.UltimaRespuesta = ahora;
            estado.UltimoError = null;
        }
        else estado.UltimoError = error.Length <= 4000 ? error : error[..4000];

        var ultima = new[] { estado.UltimaDiaria, estado.UltimaCompleta }
            .Where(x => x.HasValue).Select(x => x!.Value).DefaultIfEmpty().Max();
        estado.Estado = ultima == default
            ? "sin_datos"
            : ahora - ultima >= TimeSpan.FromDays(2) ? "retrasada" : error is null ? "al_dia" : "fallida";
        estado.Actualizado = ahora;
    }
}
