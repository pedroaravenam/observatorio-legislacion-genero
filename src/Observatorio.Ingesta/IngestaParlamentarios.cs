using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Ingesta;

/// <summary>
/// Carga los diputados con su sexo (WSDiputado), las reseñas parlamentarias de la BCN y las correcciones a mano, y enlaza
/// cada autor que aparece en las fichas del Senado con una persona. No cambia ningún proyecto: solo escribe
/// <c>parlamentario</c> y <c>autor_enlace</c>.
/// </summary>
public sealed class IngestaParlamentarios(
    ClienteSoapCamara cliente,
    ObservatorioDbContext db,
    IOptions<OpcionesIngesta> opciones,
    TimeProvider reloj)
{
    public const string Proceso = "camara.parlamentarios";
    private const string FuenteCamara = "camara";
    private const string FuenteBcn = "bcn";
    private const string FuenteManual = "manual";
    private const int MaximoApellido = 60;
    private static readonly UTF8Encoding Utf8Estricto = new(false, true);

    // Misma limpieza que el exportador (pg_temp.plano): así el texto del enlace es el que se publica.
    private const string SqlAutores = """
        SELECT DISTINCT nullif(btrim(regexp_replace(replace(replace(replace(replace(replace(a::text,
               '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&apos;', ''''), '&amp;', '&'), '\s+', ' ', 'g')), '') AS "Value"
        FROM respuesta_cruda r, LATERAL unnest(xpath('//autores/autor/PARLAMENTARIO/text()', r.contenido::xml)) a
        WHERE r.id IN (SELECT DISTINCT respuesta_senado_id FROM proyecto_ley WHERE respuesta_senado_id IS NOT NULL)
          AND xml_is_well_formed_document(r.contenido)
        """;

    public async Task<EjecucionIngesta> EjecutarAsync(CancellationToken ct)
    {
        var ejecucion = new EjecucionIngesta
        {
            Proceso = Proceso, Parametros = "diputados+bcn+alias", Inicio = reloj.GetUtcNow(), Estado = EstadoEjecucion.EnCurso,
        };
        db.Ejecuciones.Add(ejecucion);
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        try
        {
            await AsegurarCamarasAsync(ct).ConfigureAwait(false);
            var respuesta = await cliente.ConsultarAsync(LectorDiputados.Servicio, LectorDiputados.Operacion, [], ct)
                .ConfigureAwait(false);
            var diputados = LectorDiputados.Leer(respuesta.Contenido);
            await GuardarCrudaAsync(respuesta, ejecucion, ct).ConfigureAwait(false);

            var existentes = await db.Parlamentarios.ToListAsync(ct).ConfigureAwait(false);
            var ahora = reloj.GetUtcNow();
            var cambios = new Contador();
            foreach (var d in diputados)
                Aplicar(existentes, FuenteCamara, 1, d.Id, d.Nombre, d.ApellidoPaterno, d.ApellidoMaterno, d.Sexo, "camara", null, ahora, cambios);
            foreach (var fila in LeerCsv(opciones.Value.RutaBcn))
            {
                // En unas pocas reseñas antiguas la extracción dejó una frase de la biografía en el apellido materno.
                // Ningún apellido real supera este largo: se descarta ese campo y se conserva el resto de la fila.
                if (fila["apellido_materno"].Length > MaximoApellido) fila["apellido_materno"] = "";
                var senadorSolo = fila["fue_senador"] == "si" && fila["fue_diputado"] != "si";
                var sexo = fila["sexo_derivado"] is "F" or "M" ? fila["sexo_derivado"][0] : (char?)null;
                Aplicar(existentes, FuenteBcn, senadorSolo ? 2 : 1, fila["ficha_bcn"], fila["nombres"], fila["apellido_paterno"],
                    fila["apellido_materno"].Length == 0 ? null : fila["apellido_materno"], sexo, "bcn", fila["url_bcn"], ahora, cambios);
            }
            var textosManuales = new List<(string Texto, string IdOrigen)>();
            foreach (var fila in LeerCsv(opciones.Value.RutaAlias))
            {
                var idOrigen = fila["texto"];
                var sexo = fila["sexo"] is "F" or "M" ? fila["sexo"][0] : (char?)null;
                Aplicar(existentes, FuenteManual, int.Parse(fila["camara"], System.Globalization.CultureInfo.InvariantCulture), idOrigen,
                    fila["nombre"], fila["apellido_paterno"], fila["apellido_materno"].Length == 0 ? null : fila["apellido_materno"],
                    sexo, "manual", fila["url"].Length == 0 ? null : fila["url"], ahora, cambios);
                textosManuales.Add((fila["texto"], idOrigen));
            }
            await db.SaveChangesAsync(ct).ConfigureAwait(false);

            var resumen = await EnlazarAutoresAsync(existentes, textosManuales, ahora, ct).ConfigureAwait(false);
            ejecucion.RegistrosInsertados = cambios.Insertados;
            ejecucion.RegistrosActualizados = cambios.Actualizados;
            ejecucion.RegistrosSinCambio = cambios.SinCambio;
            ejecucion.Detalle = resumen;
            ejecucion.Estado = EstadoEjecucion.Exitosa;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            db.ChangeTracker.Clear();
            ejecucion.Estado = EstadoEjecucion.Fallida;
            ejecucion.Detalle = ex.Message.Length <= 4000 ? ex.Message : ex.Message[..4000];
            db.Ejecuciones.Update(ejecucion);
            throw;
        }
        finally
        {
            ejecucion.Termino = reloj.GetUtcNow();
            await db.SaveChangesAsync(CancellationToken.None).ConfigureAwait(false);
        }
        return ejecucion;
    }

    private async Task<string> EnlazarAutoresAsync(
        List<Parlamentario> parlamentarios, List<(string Texto, string IdOrigen)> manuales, DateTimeOffset ahora, CancellationToken ct)
    {
        var textos = await db.Database.SqlQueryRaw<string?>(SqlAutores).ToListAsync(ct).ConfigureAwait(false);
        var autores = textos.Where(x => x is not null).Select(x => x!).ToList();
        if (autores.Count == 0) throw new InvalidOperationException("No se encontró ningún autor en las fichas del Senado; no se reemplazan los enlaces.");

        PersonaReferencia Persona(Parlamentario p) => new(p.Id, p.Sexo, ResolutorAutores.Palabras(p.Nombre),
            ResolutorAutores.Palabras(p.ApellidoPaterno), ResolutorAutores.Palabras(p.ApellidoMaterno), p.UrlFicha);
        var camara = parlamentarios.Where(x => x.Fuente == FuenteCamara).Select(Persona).ToList();
        var bcn = parlamentarios.Where(x => x.Fuente == FuenteBcn).Select(Persona).ToList();
        var manual = new Dictionary<string, PersonaReferencia>(StringComparer.Ordinal);
        foreach (var (texto, idOrigen) in manuales)
            manual[texto] = Persona(parlamentarios.Single(x => x.Fuente == FuenteManual && x.IdOrigen == idOrigen));

        var actuales = await db.AutoresEnlaces.ToDictionaryAsync(x => x.Texto, StringComparer.Ordinal, ct).ConfigureAwait(false);
        var conteo = new SortedDictionary<string, int>(StringComparer.Ordinal);
        foreach (var texto in autores)
        {
            var r = ResolutorAutores.Resolver(texto, camara, bcn, manual);
            conteo[r.Metodo] = conteo.GetValueOrDefault(r.Metodo) + 1;
            if (!actuales.TryGetValue(texto, out var fila))
            {
                db.AutoresEnlaces.Add(new AutorEnlace
                {
                    Texto = texto, ParlamentarioId = r.ParlamentarioId, Sexo = r.Sexo, Metodo = r.Metodo, Url = r.Url, Actualizado = ahora,
                });
            }
            else if (fila.ParlamentarioId != r.ParlamentarioId || fila.Sexo != r.Sexo || fila.Metodo != r.Metodo || fila.Url != r.Url)
            {
                (fila.ParlamentarioId, fila.Sexo, fila.Metodo, fila.Url, fila.Actualizado) = (r.ParlamentarioId, r.Sexo, r.Metodo, r.Url, ahora);
            }
        }
        var vigentes = autores.ToHashSet(StringComparer.Ordinal);
        db.AutoresEnlaces.RemoveRange(actuales.Values.Where(x => !vigentes.Contains(x.Texto)));
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return $"Autores {autores.Count}: " + string.Join(", ", conteo.Select(x => $"{x.Key} {x.Value}"));
    }

    private void Aplicar(
        List<Parlamentario> existentes, string fuente, int camaraId, string idOrigen, string nombre, string paterno, string? materno,
        char? sexo, string sexoOrigen, string? url, DateTimeOffset ahora, Contador cambios)
    {
        var p = existentes.FirstOrDefault(x => x.Fuente == fuente && x.CamaraId == camaraId && x.IdOrigen == idOrigen);
        if (p is null)
        {
            var nuevo = new Parlamentario
            {
                Fuente = fuente, CamaraId = camaraId, IdOrigen = idOrigen, Nombre = nombre, ApellidoPaterno = paterno,
                ApellidoMaterno = materno, Sexo = sexo, SexoOrigen = sexo is null ? null : sexoOrigen, UrlFicha = url,
                Creado = ahora, Actualizado = ahora,
            };
            db.Parlamentarios.Add(nuevo);
            existentes.Add(nuevo);
            cambios.Insertados++;
            return;
        }
        if (p.Nombre == nombre && p.ApellidoPaterno == paterno && p.ApellidoMaterno == materno && p.Sexo == sexo && p.UrlFicha == url)
        {
            cambios.SinCambio++;
            return;
        }
        (p.Nombre, p.ApellidoPaterno, p.ApellidoMaterno, p.Sexo, p.SexoOrigen, p.UrlFicha, p.Actualizado) =
            (nombre, paterno, materno, sexo, sexo is null ? null : sexoOrigen, url, ahora);
        cambios.Actualizados++;
    }

    private async Task AsegurarCamarasAsync(CancellationToken ct)
    {
        foreach (var (id, nombre) in new[] { (1, "Cámara de Diputados"), (2, "Senado") })
            if (await db.Camaras.FindAsync([id], ct).ConfigureAwait(false) is null)
                db.Camaras.Add(new Camara { Id = id, Nombre = nombre });
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    private async Task GuardarCrudaAsync(RespuestaFuente r, EjecucionIngesta ejecucion, CancellationToken ct)
    {
        var hash = Convert.ToHexStringLower(SHA256.HashData(r.Contenido));
        var existe = await db.RespuestasCrudas.AsNoTracking().AnyAsync(
            x => x.Fuente == FuenteCamara && x.Operacion == r.Operacion && x.Parametros == r.Parametros && x.Hash == hash, ct)
            .ConfigureAwait(false);
        if (existe) { ejecucion.RespuestasRepetidas++; return; }
        db.RespuestasCrudas.Add(new RespuestaCruda
        {
            Fuente = FuenteCamara, Operacion = r.Operacion, Parametros = r.Parametros, Url = r.Url, FechaConsulta = r.FechaConsulta,
            EstadoHttp = r.EstadoHttp, Hash = hash, Contenido = Utf8Estricto.GetString(r.Contenido), EjecucionId = ejecucion.Id,
        });
        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        ejecucion.RespuestasNuevas++;
    }

    /// <summary>CSV con encabezado y comillas dobles opcionales (RFC 4180). Devuelve un diccionario por fila.</summary>
    internal static IEnumerable<Dictionary<string, string>> LeerCsv(string ruta)
    {
        var texto = File.ReadAllText(ruta, Utf8Estricto).TrimStart('﻿');
        var filas = new List<List<string>>();
        var fila = new List<string>();
        var campo = new StringBuilder();
        var entrecomillado = false;
        for (var i = 0; i < texto.Length; i++)
        {
            var c = texto[i];
            if (entrecomillado)
            {
                if (c == '"' && i + 1 < texto.Length && texto[i + 1] == '"') { campo.Append('"'); i++; }
                else if (c == '"') entrecomillado = false;
                else campo.Append(c);
            }
            else if (c == '"') entrecomillado = true;
            else if (c == ',') { fila.Add(campo.ToString()); campo.Clear(); }
            else if (c == '\n') { fila.Add(campo.ToString()); campo.Clear(); filas.Add(fila); fila = []; }
            else if (c != '\r') campo.Append(c);
        }
        if (campo.Length > 0 || fila.Count > 0) { fila.Add(campo.ToString()); filas.Add(fila); }
        var encabezado = filas[0];
        foreach (var f in filas.Skip(1).Where(f => f.Count > 1 || f[0].Length > 0))
            yield return encabezado.Select((k, i) => (k, v: i < f.Count ? f[i] : "")).ToDictionary(x => x.k, x => x.v);
    }

    private sealed class Contador
    {
        public int Insertados, Actualizados, SinCambio;
    }
}
