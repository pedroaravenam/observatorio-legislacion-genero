using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Camara;
using Observatorio.Ingesta;

namespace Observatorio.Pruebas;

public class LectorDiputadosPruebas
{
    [Fact]
    public void LeeSexoPorTextoYDescartaElRegistroSinNombre()
    {
        var diputados = LectorDiputados.Leer(Fixtures.Camara("retornarDiputados-muestra.xml"));

        Assert.Equal(2, diputados.Count);
        var victor = Assert.Single(diputados, x => x.Id == "208");
        Assert.Equal(("Víctor", "Pérez", "Varela", 'M'), (victor.Nombre, victor.ApellidoPaterno, victor.ApellidoMaterno, victor.Sexo));
        // En la fuente el valor numérico de Femenino es 0: se lee el texto, no el número.
        Assert.Equal('F', Assert.Single(diputados, x => x.Id == "975").Sexo);
    }

    [Fact]
    public void UnaRespuestaSinDiputadosEsUnaFallaDelContrato() =>
        Assert.Throws<ContratoFuenteException>(() => LectorDiputados.Leer(Encoding.UTF8.GetBytes(
            "<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Body>" +
            "<retornarDiputadosResponse xmlns=\"http://opendata.camara.cl/camaradiputados/v1\"><retornarDiputadosResult/>" +
            "</retornarDiputadosResponse></soap:Body></soap:Envelope>")));
}

public class ResolutorAutoresPruebas
{
    private static PersonaReferencia Persona(long id, char? sexo, string nombre, string paterno, string? materno = null, string? url = null) =>
        new(id, sexo, ResolutorAutores.Palabras(nombre), ResolutorAutores.Palabras(paterno), ResolutorAutores.Palabras(materno), url);

    private static readonly IReadOnlyDictionary<string, PersonaReferencia> SinManuales = new Dictionary<string, PersonaReferencia>();

    [Fact]
    public void LasPalabrasIgnoranTildesMayusculasYGuiones()
    {
        Assert.Equal(["nanco", "vasquez"], ResolutorAutores.Palabras("Ñanco  Vásquez"));
        Assert.Equal(["ruiz", "esquide", "jara"], ResolutorAutores.Palabras("Ruiz-Esquide Jara"));
        Assert.Empty(ResolutorAutores.Palabras("  "));
    }

    [Fact]
    public void EnlazaConLaCamaraYTomaElEnlaceDeLaBcn()
    {
        var camara = new[] { Persona(1, 'M', "Víctor", "Pérez", "Varela") };
        var bcn = new[] { Persona(2, 'M', "Víctor", "Pérez", "Varela", "https://bcn/victor") };

        var r = ResolutorAutores.Resolver("Pérez Varela, Víctor", camara, bcn, SinManuales);

        Assert.Equal((1L, 'M', ResolutorAutores.MetodoCamara, "https://bcn/victor"), (r.ParlamentarioId, r.Sexo, r.Metodo, r.Url));
    }

    [Fact]
    public void ApellidoCompuestoYSegundoNombreSeEnlazanPorElPrimerNombre()
    {
        var camara = new[] { Persona(7, 'F', "Jacqueline Marie", "Van Rysselberghe", "Herrera") };
        var r = ResolutorAutores.Resolver("Van Rysselberghe Herrera, Jacqueline", camara, [], SinManuales);
        Assert.Equal((7L, 'F'), (r.ParlamentarioId, r.Sexo));
    }

    [Fact]
    public void ElNombreDeUsoPuedeSerCualquieraDeLosNombresDePila()
    {
        var camara = new[] { Persona(1, 'F', "Coca Ericka", "Ñanco", "Vásquez") };
        var bcn = new[] { Persona(2, 'F', "María Soledad", "Alvear", "Valenzuela") };
        Assert.Equal(1L, ResolutorAutores.Resolver("Ñanco Vásquez, Ericka", camara, [], SinManuales).ParlamentarioId);
        Assert.Equal(2L, ResolutorAutores.Resolver("Alvear Valenzuela, Soledad", [], bcn, SinManuales).ParlamentarioId);
        // Un nombre que no es de pila de esa persona, aunque los apellidos coincidan, no basta.
        Assert.Equal(ResolutorAutores.MetodoSinDato, ResolutorAutores.Resolver("Alvear Valenzuela, Carmen", [], bcn, SinManuales).Metodo);
    }

    [Fact]
    public void UnaListaSinApellidoMaternoEnlazaPorElPaterno()
    {
        var camara = new[] { Persona(3, 'M', "Martín", "Manterola") };
        Assert.Equal(3L, ResolutorAutores.Resolver("Manterola, Martín", camara, [], SinManuales).ParlamentarioId);
        Assert.Equal(ResolutorAutores.MetodoSinDato, ResolutorAutores.Resolver("Manterola Urzúa, Martín", camara, [], SinManuales).Metodo);
    }

    [Fact]
    public void SinCoincidenciaExactaDeApellidosOPrimerNombreNoHayDato()
    {
        var camara = new[] { Persona(1, 'F', "Daniella", "Cicardini", "Milla") };
        foreach (var texto in new[] { "Cicardini, Daniella", "Cicardini Milla, Daniel", "Milla, Daniella", "Cicardini Milla", ", Daniella" })
            Assert.Equal(ResolutorAutores.MetodoSinDato, ResolutorAutores.Resolver(texto, camara, [], SinManuales).Metodo);
    }

    [Fact]
    public void LaAmbiguedadConservaElSexoSoloSiTodosLosCandidatosCoinciden()
    {
        var mismoSexo = new[] { Persona(1, 'M', "Pablo", "Prieto", "Lorca"), Persona(2, 'M', "Pablo Andrés", "Prieto", "Lorca") };
        var r = ResolutorAutores.Resolver("Prieto Lorca, Pablo", mismoSexo, [], SinManuales);
        Assert.Equal((null, 'M', ResolutorAutores.MetodoAmbiguo), (r.ParlamentarioId, r.Sexo, r.Metodo));

        var distinto = new[] { Persona(1, 'M', "Claudio", "Soto", "Rojas"), Persona(2, 'F', "Claudio", "Soto", "Rojas") };
        Assert.Equal(ResolutorAutores.MetodoSinDato, ResolutorAutores.Resolver("Soto Rojas, Claudio", distinto, [], SinManuales).Metodo);
    }

    [Fact]
    public void LaBcnCompletaLoQueLaCamaraNoTieneYLaCorreccionManualVaPrimero()
    {
        var bcn = new[] { Persona(5, 'F', "Soledad", "Alvear", "Valenzuela", "https://bcn/soledad") };
        var r = ResolutorAutores.Resolver("Alvear Valenzuela, Soledad", [], bcn, SinManuales);
        Assert.Equal((5L, 'F', ResolutorAutores.MetodoBcn), (r.ParlamentarioId, r.Sexo, r.Metodo));

        var manuales = new Dictionary<string, PersonaReferencia> { ["Alvear Valenzuela, Soledad"] = Persona(9, 'M', "X", "Y") };
        var manual = ResolutorAutores.Resolver("Alvear Valenzuela, Soledad", [], bcn, manuales);
        Assert.Equal((9L, ResolutorAutores.MetodoManual), (manual.ParlamentarioId, manual.Metodo));
    }
}

[Collection(ColeccionBaseDatos.Nombre)]
public class IngestaParlamentariosPruebas : IAsyncLifetime
{
    private readonly string carpeta = Path.Combine(Path.GetTempPath(), $"observatorio-parlam-{Guid.NewGuid():N}");
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() { if (Directory.Exists(carpeta)) Directory.Delete(carpeta, true); return Task.CompletedTask; }

    private static async Task CargarFichaConAutoresAsync()
    {
        const string xml = "<proyectos><proyecto><descripcion><boletin>17641-13</boletin></descripcion><autores>" +
            "<autor><PARLAMENTARIO>P&#233;rez Varela, V&#237;ctor</PARLAMENTARIO></autor>" +
            "<autor><PARLAMENTARIO>Cicardini Milla, Daniella</PARLAMENTARIO></autor>" +
            "<autor><PARLAMENTARIO>Alvear Valenzuela, Soledad</PARLAMENTARIO></autor>" +
            "<autor><PARLAMENTARIO>&#209;anco V&#225;squez, Ericka</PARLAMENTARIO></autor>" +
            "<autor><PARLAMENTARIO>Nadie Inexistente, Juan</PARLAMENTARIO></autor>" +
            "</autores></proyecto></proyectos>";
        await using var db = BaseDeDatos.NuevoContexto();
        db.TiposIniciativa.Add(new TipoIniciativa { Id = 2, Nombre = "Moción" });
        db.Camaras.Add(new Camara { Id = 1, Nombre = "Cámara de Diputados" });
        var ejecucion = new EjecucionIngesta { Proceso = "prueba", Parametros = "x", Inicio = DateTimeOffset.UtcNow, Estado = EstadoEjecucion.Exitosa };
        db.Ejecuciones.Add(ejecucion);
        await db.SaveChangesAsync();
        var cruda = new RespuestaCruda
        {
            Fuente = "senado", Operacion = "tramitacion", Parametros = "boletin=17641", Url = "u", FechaConsulta = DateTimeOffset.UtcNow,
            EstadoHttp = 200, Hash = new string('a', 64), Contenido = xml, EjecucionId = ejecucion.Id,
        };
        db.RespuestasCrudas.Add(cruda);
        await db.SaveChangesAsync();
        db.Proyectos.Add(new ProyectoLey
        {
            Boletin = "17641-13", Titulo = "t", FechaIngreso = new DateOnly(2025, 7, 1), TipoIniciativaId = 2, CamaraOrigenId = 1,
            Fuente = "senado", IdOrigen = "17641-13", RespuestaCrudaId = cruda.Id, FechaConsulta = cruda.FechaConsulta,
            HashContenido = new string('b', 64), Creado = DateTimeOffset.UtcNow, Actualizado = DateTimeOffset.UtcNow,
            RespuestaSenadoId = cruda.Id,
        });
        await db.SaveChangesAsync();
    }

    private async Task<EjecucionIngesta> EjecutarAsync()
    {
        Directory.CreateDirectory(carpeta);
        var bcn = Path.Combine(carpeta, "bcn.csv");
        await File.WriteAllTextAsync(bcn,
            "ficha_bcn,url_bcn,nombre_completo,nombres,apellido_paterno,apellido_materno,sexo_derivado,n_cargos,fue_diputado,fue_senador,primer_anio,grupo_listado\n" +
            "Victor_Perez,https://bcn/victor,Víctor Pérez Varela,Víctor,Pérez,Varela,M,3,si,no,1990,1990-2026\n" +
            "Soledad_Alvear,https://bcn/soledad,\"Soledad Alvear Valenzuela\",Soledad,Alvear,Valenzuela,F,3,no,si,1990,1990-2026\n" +
            // Defecto real de la lista heredada: una frase de la biografía en el apellido materno, con comillas dobles.
            "Francisco_Lobos,https://bcn/lobos,Francisco Lobos,Francisco,Lobos,\"Fue elegido diputado por la Agrupación \"\"Tomé, Concepción, Talcahuano\"\", período 1937-1941; integró la Comisión Permanente de Trabajo y Legislación Social.\",M,1,si,no,1937,1925-1973\n");
        var alias = Path.Combine(carpeta, "alias.csv");
        await File.WriteAllTextAsync(alias,
            "texto,sexo,nombre,apellido_paterno,apellido_materno,camara,url,nota\n" +
            "\"Ñanco Vásquez, Ericka\",F,Ericka,Ñanco,Vásquez,2,,Verificada a mano\n");
        var fuente = new FuenteSimulada();
        fuente.Responder("retornarDiputados", Fixtures.Camara("retornarDiputados-muestra.xml"));
        await using var db = BaseDeDatos.NuevoContexto();
        var ingesta = new IngestaParlamentarios(fuente.Cliente(), db,
            Options.Create(new OpcionesIngesta { RutaBcn = bcn, RutaAlias = alias }), TimeProvider.System);
        return await ingesta.EjecutarAsync(CancellationToken.None);
    }

    [FactConBaseDatos]
    public async Task EnlazaCadaAutorConSuMetodoYUnaSegundaCorridaNoCambiaNada()
    {
        await CargarFichaConAutoresAsync();

        var primera = await EjecutarAsync();
        var segunda = await EjecutarAsync();

        Assert.Equal(EstadoEjecucion.Exitosa, primera.Estado);
        Assert.Equal((0, 0), (segunda.RegistrosInsertados, segunda.RegistrosActualizados));
        Assert.Equal(1, primera.RespuestasNuevas);
        Assert.Equal(1, segunda.RespuestasRepetidas);
        await using var db = BaseDeDatos.NuevoContexto();
        var enlaces = await db.AutoresEnlaces.AsNoTracking().ToDictionaryAsync(x => x.Texto);
        Assert.Equal(5, enlaces.Count);
        Assert.Equal(('M', ResolutorAutores.MetodoCamara, "https://bcn/victor"),
            (enlaces["Pérez Varela, Víctor"].Sexo, enlaces["Pérez Varela, Víctor"].Metodo, enlaces["Pérez Varela, Víctor"].Url));
        Assert.Equal(('F', ResolutorAutores.MetodoCamara), (enlaces["Cicardini Milla, Daniella"].Sexo, enlaces["Cicardini Milla, Daniella"].Metodo));
        Assert.Equal(('F', ResolutorAutores.MetodoBcn), (enlaces["Alvear Valenzuela, Soledad"].Sexo, enlaces["Alvear Valenzuela, Soledad"].Metodo));
        Assert.Equal(('F', ResolutorAutores.MetodoManual), (enlaces["Ñanco Vásquez, Ericka"].Sexo, enlaces["Ñanco Vásquez, Ericka"].Metodo));
        Assert.Equal((null, ResolutorAutores.MetodoSinDato), (enlaces["Nadie Inexistente, Juan"].Sexo, enlaces["Nadie Inexistente, Juan"].Metodo));
        // 2 diputados de la fuente (el registro sin nombre se descarta) + 3 de la BCN + 1 corrección a mano.
        Assert.Equal(6, await db.Parlamentarios.CountAsync());
        Assert.Null((await db.Parlamentarios.SingleAsync(x => x.IdOrigen == "Francisco_Lobos")).ApellidoMaterno);
        Assert.Equal('F', (await db.Parlamentarios.SingleAsync(x => x.IdOrigen == "975")).Sexo);
        Assert.Equal("camara", (await db.Parlamentarios.SingleAsync(x => x.IdOrigen == "975")).SexoOrigen);
        Assert.Equal(1, await db.RespuestasCrudas.CountAsync(x => x.Fuente == "camara" && x.Operacion == "retornarDiputados"));
    }

    [FactConBaseDatos]
    public async Task SinAutoresEnLasFichasNoSeBorranLosEnlacesExistentes()
    {
        await CargarFichaConAutoresAsync();
        await EjecutarAsync();
        await using (var db = BaseDeDatos.NuevoContexto())
            await db.Database.ExecuteSqlRawAsync("UPDATE respuesta_cruda SET contenido = '<proyectos/>' WHERE fuente = 'senado'");

        await Assert.ThrowsAsync<InvalidOperationException>(EjecutarAsync);

        await using var verificacion = BaseDeDatos.NuevoContexto();
        Assert.Equal(5, await verificacion.AutoresEnlaces.CountAsync());
    }
}
