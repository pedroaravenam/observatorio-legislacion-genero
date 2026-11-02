using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;

namespace Observatorio.Api;

public sealed record ProyectoDto(
    string Boletin,
    string Titulo,
    DateOnly FechaIngreso,
    string TipoIniciativa,
    string CamaraOrigen,
    bool? Admisible,
    string Fuente,
    DateTimeOffset FechaConsulta);

public sealed record AutorDto(string Nombre, string ApellidoPaterno, string? ApellidoMaterno, string Camara);

public sealed record ProyectoDetalleDto(
    string Boletin,
    string Titulo,
    DateOnly FechaIngreso,
    string TipoIniciativa,
    string CamaraOrigen,
    bool? Admisible,
    IReadOnlyList<AutorDto> Autores,
    string Fuente,
    string IdOrigen,
    DateTimeOffset FechaConsulta);

public sealed record Pagina<T>(IReadOnlyList<T> Elementos, int Total, int NumeroPagina, int Tamano);

public sealed record OpcionFiltro(int Id, string Nombre);

public sealed record Filtros(IReadOnlyList<OpcionFiltro> TiposIniciativa, IReadOnlyList<OpcionFiltro> Camaras, IReadOnlyList<int> Annos);

public static class ConsultaProyectos
{
    public const int TamanoMaximo = 100;

    public static void MapearProyectos(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/proyectos");

        grupo.MapGet("/", async (
            ObservatorioDbContext db,
            string? texto, int? tipo, int? camara, int? anno, int? pagina, int? tamano,
            CancellationToken ct) =>
        {
            var numero = Math.Max(1, pagina ?? 1);
            var porPagina = Math.Clamp(tamano ?? 20, 1, TamanoMaximo);

            var consulta = db.Proyectos.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(texto))
            {
                // Búsqueda simple y portable. La búsqueda de texto completo es el módulo aislado de la decisión 0003.
                var t = texto.Trim().ToLowerInvariant();
                // La expresión se traduce a SQL (LOWER ... LIKE); las sugerencias de cultura de .NET no aplican.
#pragma warning disable CA1304, CA1311, CA1862
                consulta = consulta.Where(p => p.Titulo.ToLower().Contains(t) || p.Boletin.Contains(t));
#pragma warning restore CA1304, CA1311, CA1862
            }
            if (tipo is not null) consulta = consulta.Where(p => p.TipoIniciativaId == tipo);
            if (camara is not null) consulta = consulta.Where(p => p.CamaraOrigenId == camara);
            if (anno is not null)
            {
                var desde = new DateOnly(anno.Value, 1, 1);
                var hasta = desde.AddYears(1);
                consulta = consulta.Where(p => p.FechaIngreso >= desde && p.FechaIngreso < hasta);
            }

            var total = await consulta.CountAsync(ct);
            var elementos = await consulta
                .OrderByDescending(p => p.FechaIngreso).ThenByDescending(p => p.Boletin)
                .Skip((numero - 1) * porPagina).Take(porPagina)
                .Select(p => new ProyectoDto(
                    p.Boletin, p.Titulo, p.FechaIngreso,
                    p.TipoIniciativa!.Nombre, p.CamaraOrigen!.Nombre, p.Admisible,
                    p.Fuente, p.FechaConsulta))
                .ToListAsync(ct);

            return new Pagina<ProyectoDto>(elementos, total, numero, porPagina);
        });

        grupo.MapGet("/{boletin}", async Task<IResult> (ObservatorioDbContext db, string boletin, CancellationToken ct) =>
        {
            var p = await db.Proyectos.AsNoTracking()
                .Where(x => x.Boletin == boletin)
                .Select(x => new
                {
                    x.Boletin, x.Titulo, x.FechaIngreso,
                    Tipo = x.TipoIniciativa!.Nombre, Camara = x.CamaraOrigen!.Nombre, x.Admisible,
                    x.Fuente, x.IdOrigen, x.FechaConsulta,
                    Autores = x.Autores.OrderBy(a => a.Orden).Select(a => new AutorDto(
                        a.Parlamentario!.Nombre, a.Parlamentario.ApellidoPaterno, a.Parlamentario.ApellidoMaterno, a.Parlamentario.Camara!.Nombre)).ToList(),
                })
                .FirstOrDefaultAsync(ct);
            return p is null
                ? Results.Problem($"No existe el proyecto con boletín {boletin}.", statusCode: StatusCodes.Status404NotFound)
                : Results.Ok(new ProyectoDetalleDto(p.Boletin, p.Titulo, p.FechaIngreso, p.Tipo, p.Camara, p.Admisible, p.Autores, p.Fuente, p.IdOrigen, p.FechaConsulta));
        });

        grupo.MapGet("/filtros", async (ObservatorioDbContext db, CancellationToken ct) =>
        {
            var tipos = await db.TiposIniciativa.AsNoTracking().OrderBy(x => x.Nombre).Select(x => new OpcionFiltro(x.Id, x.Nombre)).ToListAsync(ct);
            var camaras = await db.Camaras.AsNoTracking().OrderBy(x => x.Nombre).Select(x => new OpcionFiltro(x.Id, x.Nombre)).ToListAsync(ct);
            var annos = await db.Proyectos.AsNoTracking().Select(p => p.FechaIngreso.Year).Distinct().OrderByDescending(a => a).ToListAsync(ct);
            return new Filtros(tipos, camaras, annos);
        });
    }
}
