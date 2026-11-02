using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;

namespace Observatorio.Pruebas;

/// <summary>
/// Pruebas contra PostgreSQL real, con el esquema aplicado por Liquibase.
/// Requieren OBSERVATORIO_PRUEBAS_BD (cadena de conexión). Sin ella se omiten, salvo que
/// OBSERVATORIO_PRUEBAS_EXIGIR_BD=1, como en la integración continua: ahí una omisión sería un falso verde.
/// </summary>
public sealed class FactConBaseDatosAttribute : FactAttribute
{
    public FactConBaseDatosAttribute()
    {
        if (BaseDeDatos.CadenaConexion is null && Environment.GetEnvironmentVariable("OBSERVATORIO_PRUEBAS_EXIGIR_BD") != "1")
        {
            Skip = "Sin OBSERVATORIO_PRUEBAS_BD: se omite la prueba contra base de datos.";
        }
    }
}

internal static class BaseDeDatos
{
    public static string? CadenaConexion => Environment.GetEnvironmentVariable("OBSERVATORIO_PRUEBAS_BD");

    public static string CadenaExigida => CadenaConexion
        ?? throw new InvalidOperationException("OBSERVATORIO_PRUEBAS_EXIGIR_BD=1 pero falta OBSERVATORIO_PRUEBAS_BD.");

    public static ObservatorioDbContext NuevoContexto() =>
        new(new DbContextOptionsBuilder<ObservatorioDbContext>().UseNpgsql(CadenaExigida).Options);

    /// <summary>Deja las tablas vacías. Las pruebas de base de datos no corren en paralelo entre sí.</summary>
    public static async Task VaciarAsync()
    {
        await using var db = NuevoContexto();
        await db.Database.ExecuteSqlRawAsync(
            "TRUNCATE proyecto_ley, tipo_iniciativa, camara, respuesta_cruda, ingesta_ejecucion RESTART IDENTITY CASCADE");
    }
}

[CollectionDefinition(Nombre, DisableParallelization = true)]
public sealed class ColeccionBaseDatos
{
    public const string Nombre = "Base de datos";
}
