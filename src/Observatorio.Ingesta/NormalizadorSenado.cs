using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;

namespace Observatorio.Ingesta;

public sealed record ContextoCargaSenado(long EjecucionId, DateTimeOffset? UltimaConfirmacion);

/// <summary>Normaliza fichas guardadas en la capa cruda y conserva la procedencia de la Cámara.</summary>
public sealed class NormalizadorSenado(ObservatorioDbContext db, TimeProvider reloj)
{
    public const string Fuente = "senado";

    public async Task<ResultadoNormalizacion> NormalizarAsync(RespuestaCruda cruda, string boletin, CancellationToken ct,
        string origen = "ficha", ContextoCargaSenado? contextoCarga = null)
    {
        ValidarCruda(cruda);
        var ficha = LectorFichaSenado.Leer(Encoding.UTF8.GetBytes(cruda.Contenido), boletin,
            origen is "base" or "completa");
        return await NormalizarFichasAsync(cruda, [ficha], origen, contextoCarga, ct).ConfigureAwait(false);
    }

    public async Task<ResultadoNormalizacion> NormalizarLoteAsync(RespuestaCruda cruda, CancellationToken ct,
        string origen = "fecha")
    {
        ValidarCruda(cruda);
        var fichas = LectorFichaSenado.LeerLote(Encoding.UTF8.GetBytes(cruda.Contenido));
        return await NormalizarFichasAsync(cruda, fichas, origen, null, ct).ConfigureAwait(false);
    }

    private static void ValidarCruda(RespuestaCruda cruda)
    {
        ArgumentNullException.ThrowIfNull(cruda);
        if (cruda.Fuente != Fuente || cruda.Operacion != "tramitacion")
            throw new ArgumentException("La respuesta no es de tramitación del Senado.", nameof(cruda));
    }

    private async Task<ResultadoNormalizacion> NormalizarFichasAsync(
        RespuestaCruda cruda, IReadOnlyList<FichaFuenteSenado> fichas, string origen,
        ContextoCargaSenado? contextoCarga, CancellationToken ct)
    {
        // Toda la respuesta se valida antes de modificar la base. Una falla posterior revierte el lote.
        await using var transaccion = await db.Database.BeginTransactionAsync(ct).ConfigureAwait(false);
        await AsegurarCatalogosAsync(fichas, ct).ConfigureAwait(false);
        var insertados = 0;
        var actualizados = 0;
        var sinCambio = 0;
        foreach (var ficha in fichas)
        {
            var (resultado, proyecto, hashAnterior, fechaAnterior) =
                await NormalizarFichaAsync(cruda, ficha, origen, ct).ConfigureAwait(false);
            insertados += resultado.Insertados;
            actualizados += resultado.Actualizados;
            sinCambio += resultado.SinCambio;
            DateTimeOffset? ultimaConfirmacion = contextoCarga?.UltimaConfirmacion;
            if (fechaAnterior is not null && (ultimaConfirmacion is null || fechaAnterior > ultimaConfirmacion))
                ultimaConfirmacion = fechaAnterior;
            if (contextoCarga is not null && ultimaConfirmacion is not null &&
                resultado.Insertados + resultado.Actualizados > 0)
                db.DesactualizacionesSenado.Add(new DesactualizacionSenado
                {
                    Proyecto = proyecto,
                    EjecucionId = contextoCarga.EjecucionId,
                    RespuestaCrudaId = cruda.Id,
                    Detectado = reloj.GetUtcNow(),
                    UltimaConfirmacion = ultimaConfirmacion.Value,
                    Insertados = resultado.Insertados,
                    Actualizados = resultado.Actualizados,
                    HashAnterior = hashAnterior,
                    HashActual = proyecto.HashSenado,
                });
        }
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        await transaccion.CommitAsync(ct).ConfigureAwait(false);
        return new ResultadoNormalizacion(insertados, actualizados, sinCambio);
    }

    private async Task AsegurarCatalogosAsync(IReadOnlyList<FichaFuenteSenado> fichas, CancellationToken ct)
    {
        foreach (var codigo in fichas.Select(x => x.TipoIniciativaCodigo).Distinct())
            if (await db.TiposIniciativa.FindAsync([codigo], ct).ConfigureAwait(false) is null)
                db.TiposIniciativa.Add(new TipoIniciativa { Id = codigo, Nombre = codigo == 1 ? "Mensaje" : "Moción" });
        foreach (var codigo in fichas.Select(x => x.CamaraOrigenCodigo).Distinct())
            if (await db.Camaras.FindAsync([codigo], ct).ConfigureAwait(false) is null)
                db.Camaras.Add(new Camara { Id = codigo, Nombre = codigo == 1 ? "Cámara de Diputados" : "Senado" });
    }

    private async Task<(ResultadoNormalizacion Resultado, ProyectoLey Proyecto, string? HashAnterior,
        DateTimeOffset? FechaAnterior)> NormalizarFichaAsync(
        RespuestaCruda cruda, FichaFuenteSenado ficha, string origen, CancellationToken ct)
    {
        var proyecto = await db.Proyectos.Include(x => x.TramitesSenado).Include(x => x.ObservacionesSenado)
            .SingleOrDefaultAsync(x => x.Boletin == ficha.Boletin, ct).ConfigureAwait(false);
        if (ficha.Tramites.Count == 0 && proyecto?.TramitesSenado.Count > 0)
            throw new FuenteSenadoException($"La ficha de {ficha.Boletin} dejó de traer trámites; se conservan los anteriores.");
        int insertados = 0, actualizados = 0, sinCambio = 0;
        var nuevo = proyecto is null;
        var hashAnterior = proyecto?.HashSenado;
        var fechaAnterior = proyecto?.FechaConsultaSenado;
        var hashEstado = HashEstado(ficha);
        if (nuevo)
        {
            proyecto = new ProyectoLey
            {
                Boletin = ficha.Boletin,
                Titulo = ficha.Titulo,
                FechaIngreso = ficha.FechaIngreso,
                TipoIniciativaId = ficha.TipoIniciativaCodigo,
                CamaraOrigenId = ficha.CamaraOrigenCodigo,
                Fuente = Fuente,
                IdOrigen = ficha.Boletin,
                RespuestaCrudaId = cruda.Id,
                FechaConsulta = cruda.FechaConsulta,
                HashContenido = HashProyecto(ficha),
                Creado = reloj.GetUtcNow(),
                Actualizado = reloj.GetUtcNow(),
                EstadoSenado = ficha.Estado,
                EtapaSenado = ficha.Etapa,
                SubetapaSenado = ficha.Subetapa,
                RespuestaSenadoId = cruda.Id,
                FechaConsultaSenado = cruda.FechaConsulta,
                HashSenado = hashEstado,
            };
            db.Proyectos.Add(proyecto);
            insertados++;
        }
        else
        {
            if (proyecto!.Fuente == Fuente && proyecto.HashContenido != HashProyecto(ficha))
            {
                proyecto.Titulo = ficha.Titulo;
                proyecto.FechaIngreso = ficha.FechaIngreso;
                proyecto.TipoIniciativaId = ficha.TipoIniciativaCodigo;
                proyecto.CamaraOrigenId = ficha.CamaraOrigenCodigo;
                proyecto.RespuestaCrudaId = cruda.Id;
                proyecto.FechaConsulta = cruda.FechaConsulta;
                proyecto.HashContenido = HashProyecto(ficha);
                proyecto.Actualizado = reloj.GetUtcNow();
                actualizados++;
            }
            else if (proyecto.Fuente == Fuente) sinCambio++;
            if (proyecto.HashSenado != hashEstado)
            {
                proyecto.EstadoSenado = ficha.Estado;
                proyecto.EtapaSenado = ficha.Etapa;
                proyecto.SubetapaSenado = ficha.Subetapa;
                proyecto.RespuestaSenadoId = cruda.Id;
                proyecto.FechaConsultaSenado = cruda.FechaConsulta;
                proyecto.HashSenado = hashEstado;
                actualizados++;
            }
            else sinCambio++;
        }

        var existentes = proyecto!.TramitesSenado.ToDictionary(x => x.Posicion);
        foreach (var tramite in ficha.Tramites)
        {
            if (!existentes.TryGetValue(tramite.Posicion, out var actual))
            {
                proyecto.TramitesSenado.Add(new TramiteSenado
                {
                    Posicion = tramite.Posicion,
                    Fecha = tramite.Fecha,
                    Sesion = tramite.Sesion,
                    Descripcion = tramite.Descripcion,
                    Etapa = tramite.Etapa,
                    Camara = tramite.Camara,
                    RespuestaCrudaId = cruda.Id,
                });
                insertados++;
            }
            else if (actual.Fecha != tramite.Fecha || actual.Sesion != tramite.Sesion ||
                     actual.Descripcion != tramite.Descripcion || actual.Etapa != tramite.Etapa || actual.Camara != tramite.Camara)
            {
                actual.Fecha = tramite.Fecha;
                actual.Sesion = tramite.Sesion;
                actual.Descripcion = tramite.Descripcion;
                actual.Etapa = tramite.Etapa;
                actual.Camara = tramite.Camara;
                actual.RespuestaCrudaId = cruda.Id;
                actualizados++;
            }
            else sinCambio++;
        }
        foreach (var anterior in proyecto.TramitesSenado.Where(x => x.Posicion > ficha.Tramites.Count))
        {
            db.TramitesSenado.Remove(anterior);
            actualizados++;
        }
        var vistas = proyecto.ObservacionesSenado.Select(x => x.Huella).ToHashSet(StringComparer.Ordinal);
        var origenObservacion = origen == "base" && vistas.Count > 0 ? "completa" : origen;
        var diaVisto = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(cruda.FechaConsulta,
            TimeZoneInfo.FindSystemTimeZoneById("America/Santiago")).DateTime);
        foreach (var tramite in ficha.Tramites)
        {
            var huella = HuellaTramite(tramite);
            if (!vistas.Add(huella)) continue;
            var fecha = tramite.Fecha;
            var atraso = fecha is not null && fecha >= new DateOnly(1990, 1, 1) &&
                fecha <= diaVisto.AddYears(1)
                ? diaVisto.DayNumber - fecha.Value.DayNumber
                : (int?)null;
            proyecto.ObservacionesSenado.Add(new ObservacionTramiteSenado
            {
                Huella = huella,
                FechaTramite = fecha,
                PrimeraVista = cruda.FechaConsulta,
                RetrasoDias = atraso,
                Origen = origenObservacion,
                RespuestaCrudaId = cruda.Id,
            });
        }
        return (new ResultadoNormalizacion(insertados, actualizados, sinCambio), proyecto, hashAnterior, fechaAnterior);
    }

    private static string HuellaTramite(TramiteFuenteSenado tramite) => Huella(string.Join('\u001f',
        tramite.Fecha?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "",
        tramite.Sesion, tramite.Descripcion, tramite.Etapa, tramite.Camara));

    private static string HashProyecto(FichaFuenteSenado ficha) => Huella(string.Join('\u001f',
        ficha.Boletin, ficha.Titulo, ficha.FechaIngreso.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        ficha.TipoIniciativaCodigo.ToString(CultureInfo.InvariantCulture),
        ficha.CamaraOrigenCodigo.ToString(CultureInfo.InvariantCulture)));

    private static string HashEstado(FichaFuenteSenado ficha) =>
        Huella(string.Join('\u001f', ficha.Estado, ficha.Etapa, ficha.Subetapa));

    private static string Huella(string contenido) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(contenido)));
}
