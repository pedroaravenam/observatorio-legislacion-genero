using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Observatorio.Datos;

public static class RegistroDatos
{
    /// <summary>Registra el contexto contra PostgreSQL. Cambiar de motor es cambiar este método (decisión 0002).</summary>
    public static IServiceCollection AddObservatorioDatos(this IServiceCollection services, string cadenaConexion) =>
        services.AddDbContext<ObservatorioDbContext>(o => o.UseNpgsql(cadenaConexion));
}
