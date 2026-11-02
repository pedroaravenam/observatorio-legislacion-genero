using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Ingesta;

public sealed record ResultadoNormalizacion(int Insertados, int Actualizados, int SinCambio);

public sealed record ResultadoAutores(int Agregados, int Quitados, int Actualizados, int SinCambio, int ParlamentariosNuevos);

/// <summary>
/// Lleva proyectos desde una respuesta cruda ya guardada al modelo canónico.
/// Trabaja solo con lo guardado, de modo que se puede reprocesar sin volver a consultar la fuente.
/// Es idempotente: aplicar dos veces la misma respuesta no cambia nada.
/// </summary>
public sealed class NormalizadorProyectos(ObservatorioDbContext db, TimeProvider reloj)
{
    public const string Fuente = "camara";

    public async Task<ResultadoNormalizacion> NormalizarAsync(RespuestaCruda cruda, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(cruda);
        var proyectos = LectorProyectos.LeerLista(Encoding.UTF8.GetBytes(cruda.Contenido), cruda.Operacion)
            // Si la fuente repite un boletín en la misma lista, se queda el último.
            .GroupBy(p => p.Boletin, StringComparer.Ordinal)
            .Select(g => g.Last())
            .ToList();

        await AsegurarCatalogosAsync(proyectos, ct).ConfigureAwait(false);

        var boletines = proyectos.Select(p => p.Boletin).ToList();
        var existentes = await db.Proyectos
            .Where(p => boletines.Contains(p.Boletin))
            .ToDictionaryAsync(p => p.Boletin, StringComparer.Ordinal, ct)
            .ConfigureAwait(false);

        var ahora = reloj.GetUtcNow();
        int insertados = 0, actualizados = 0, sinCambio = 0;
        foreach (var p in proyectos)
        {
            var hash = HashContenido(p);
            if (!existentes.TryGetValue(p.Boletin, out var actual))
            {
                db.Proyectos.Add(new ProyectoLey
                {
                    Boletin = p.Boletin,
                    Titulo = p.Titulo,
                    FechaIngreso = p.FechaIngreso,
                    TipoIniciativaId = p.TipoIniciativaCodigo,
                    CamaraOrigenId = p.CamaraOrigenCodigo,
                    Admisible = p.Admisible,
                    Fuente = Fuente,
                    IdOrigen = p.IdOrigen,
                    RespuestaCrudaId = cruda.Id,
                    FechaConsulta = cruda.FechaConsulta,
                    HashContenido = hash,
                    Creado = ahora,
                    Actualizado = ahora,
                });
                insertados++;
            }
            else if (actual.HashContenido != hash || actual.Fuente != Fuente)
            {
                actual.Titulo = p.Titulo;
                actual.FechaIngreso = p.FechaIngreso;
                actual.TipoIniciativaId = p.TipoIniciativaCodigo;
                actual.CamaraOrigenId = p.CamaraOrigenCodigo;
                actual.Admisible = p.Admisible;
                actual.Fuente = Fuente;
                actual.IdOrigen = p.IdOrigen;
                actual.RespuestaCrudaId = cruda.Id;
                actual.FechaConsulta = cruda.FechaConsulta;
                actual.HashContenido = hash;
                actual.Actualizado = ahora;
                actualizados++;
            }
            else
            {
                sinCambio++;
            }
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return new ResultadoNormalizacion(insertados, actualizados, sinCambio);
    }

    /// <summary>
    /// Sincroniza los autores de un proyecto con el detalle guardado en <paramref name="cruda"/>.
    /// El proyecto debe existir: los autores cuelgan de un proyecto ya normalizado desde las listas.
    /// Devuelve null si la fuente no conoce el boletín o si el proyecto no está en la base.
    /// </summary>
    public async Task<ResultadoAutores?> NormalizarAutoresAsync(RespuestaCruda cruda, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(cruda);
        var detalle = LectorProyectos.LeerDetalle(Encoding.UTF8.GetBytes(cruda.Contenido));
        if (detalle is null) return null;

        var proyecto = await db.Proyectos.Include(p => p.Autores)
            .FirstOrDefaultAsync(p => p.Boletin == detalle.Proyecto.Boletin, ct).ConfigureAwait(false);
        if (proyecto is null) return null;

        await AsegurarCamarasAsync(detalle.Autores.Select(a => a.CamaraCodigo), ct).ConfigureAwait(false);

        var ahora = reloj.GetUtcNow();
        var parlamentariosNuevos = 0;
        var deseados = new Dictionary<long, int>();
        foreach (var autor in detalle.Autores)
        {
            var p = await db.Parlamentarios.FirstOrDefaultAsync(
                x => x.Fuente == Fuente && x.CamaraId == autor.CamaraCodigo && x.IdOrigen == autor.IdOrigen, ct).ConfigureAwait(false);
            if (p is null)
            {
                p = new Parlamentario
                {
                    Fuente = Fuente,
                    CamaraId = autor.CamaraCodigo,
                    IdOrigen = autor.IdOrigen,
                    Nombre = autor.Nombre,
                    ApellidoPaterno = autor.ApellidoPaterno,
                    ApellidoMaterno = autor.ApellidoMaterno,
                    Creado = ahora,
                    Actualizado = ahora,
                };
                db.Parlamentarios.Add(p);
                await db.SaveChangesAsync(ct).ConfigureAwait(false);
                parlamentariosNuevos++;
            }
            else if (p.Nombre != autor.Nombre || p.ApellidoPaterno != autor.ApellidoPaterno || p.ApellidoMaterno != autor.ApellidoMaterno)
            {
                p.Nombre = autor.Nombre;
                p.ApellidoPaterno = autor.ApellidoPaterno;
                p.ApellidoMaterno = autor.ApellidoMaterno;
                p.Actualizado = ahora;
            }
            // Si la fuente repitiera un autor, vale su primera posición.
            deseados.TryAdd(p.Id, autor.Posicion);
        }

        int agregados = 0, quitados = 0, actualizados = 0, sinCambio = 0;
        foreach (var actual in proyecto.Autores.ToList())
        {
            if (!deseados.TryGetValue(actual.ParlamentarioId, out var orden))
            {
                db.ProyectoAutores.Remove(actual);
                quitados++;
            }
            else if (actual.Orden != orden)
            {
                actual.Orden = orden;
                actual.RespuestaCrudaId = cruda.Id;
                actualizados++;
            }
            else
            {
                sinCambio++;
            }
        }
        var existentes = proyecto.Autores.Select(a => a.ParlamentarioId).ToHashSet();
        foreach (var (parlamentarioId, orden) in deseados.Where(d => !existentes.Contains(d.Key)))
        {
            db.ProyectoAutores.Add(new ProyectoAutor { ProyectoId = proyecto.Id, ParlamentarioId = parlamentarioId, Orden = orden, RespuestaCrudaId = cruda.Id });
            agregados++;
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return new ResultadoAutores(agregados, quitados, actualizados, sinCambio, parlamentariosNuevos);
    }

    /// <summary>Las cámaras de los autores pueden no haber aparecido aún como cámara de origen de un proyecto.</summary>
    private async Task AsegurarCamarasAsync(IEnumerable<int> codigos, CancellationToken ct)
    {
        foreach (var codigo in codigos.Distinct())
        {
            if (await db.Camaras.FindAsync([codigo], ct).ConfigureAwait(false) is null)
            {
                db.Camaras.Add(new Camara { Id = codigo, Nombre = codigo == LectorProyectos.CodigoSenado ? "Senado" : "Cámara de Diputados" });
            }
        }
    }

    private async Task AsegurarCatalogosAsync(List<ProyectoFuente> proyectos, CancellationToken ct)
    {
        foreach (var (id, nombre) in proyectos.Select(p => (p.TipoIniciativaCodigo, p.TipoIniciativaNombre)).Distinct())
        {
            var tipo = await db.TiposIniciativa.FindAsync([id], ct).ConfigureAwait(false);
            if (tipo is null) db.TiposIniciativa.Add(new TipoIniciativa { Id = id, Nombre = nombre });
            else if (tipo.Nombre != nombre) tipo.Nombre = nombre;
        }
        foreach (var (id, nombre) in proyectos.Select(p => (p.CamaraOrigenCodigo, p.CamaraOrigenNombre)).Distinct())
        {
            var camara = await db.Camaras.FindAsync([id], ct).ConfigureAwait(false);
            if (camara is null) db.Camaras.Add(new Camara { Id = id, Nombre = nombre });
            else if (camara.Nombre != nombre) camara.Nombre = nombre;
        }
    }

    /// <summary>Huella de los campos normalizados. Si no cambia, el registro no se toca.</summary>
    internal static string HashContenido(ProyectoFuente p)
    {
        var texto = string.Join('\u001f',
            p.IdOrigen, p.Boletin, p.Titulo,
            p.FechaIngreso.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            p.TipoIniciativaCodigo.ToString(CultureInfo.InvariantCulture),
            p.CamaraOrigenCodigo.ToString(CultureInfo.InvariantCulture),
            p.Admisible?.ToString() ?? "");
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(texto)));
    }
}
