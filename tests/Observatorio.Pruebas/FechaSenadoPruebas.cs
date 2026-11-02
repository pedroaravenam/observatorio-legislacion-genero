using System.Net;
using System.Text;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Observatorio.Datos;
using Observatorio.Dominio;
using Observatorio.Fuentes.Senado;
using Observatorio.Ingesta;

namespace Observatorio.Pruebas;

public class LectorFechaSenadoPruebas
{
    [Fact]
    public void LeeDosFichasRealesYRechazaLoteParcial()
    {
        var lote = FechaSenadoPruebas.LoteReal();
        var fichas = LectorFichaSenado.LeerLote(lote);
        Assert.Equal(["17641-13", "11929-13"], fichas.Select(x => x.Boletin));
        Assert.Equal((1, 1), (fichas[0].TipoIniciativaCodigo, fichas[0].CamaraOrigenCodigo));
        Assert.Equal((2, 2), (fichas[1].TipoIniciativaCodigo, fichas[1].CamaraOrigenCodigo));
        var incompleto = Encoding.UTF8.GetString(lote).Replace(
            "<tramitacion>", "<tramitacion_invalida>", StringComparison.Ordinal);
        Assert.Throws<FuenteSenadoException>(() => LectorFichaSenado.LeerLote(Encoding.UTF8.GetBytes(incompleto)));
    }
}

[Collection(ColeccionBaseDatos.Nombre)]
public class FechaSenadoPruebas : IAsyncLifetime
{
    public Task InitializeAsync() => BaseDeDatos.CadenaConexion is null ? Task.CompletedTask : BaseDeDatos.VaciarAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    internal static byte[] LoteReal()
    {
        var lote = new XDocument(new XElement("proyectos"));
        foreach (var archivo in new[] { "17641-13.xml", "11929-13.xml" })
            lote.Root!.Add(XDocument.Parse(Encoding.UTF8.GetString(Fixtures.Senado(archivo))).Root!.Elements());
        return Encoding.UTF8.GetBytes(lote.ToString(SaveOptions.DisableFormatting));
    }

    [FactConBaseDatos]
    public async Task RetrocedeFechaCreaProyectoRepiteSinDuplicarYConservaTramitesAlLlegarCamara()
    {
        await using (var db = BaseDeDatos.NuevoContexto())
            await Ingestas.Crear(db, FuenteSimulada.ConFixtures2025(), detalle: false).EjecutarAsync(2025, CancellationToken.None);
        var fuente = new SenadoPorFechaSimulado("<div>No existe el n&uacute;mero de bolet&iacute;n solicitado</div>"u8.ToArray(), LoteReal());
        var hoy = new DateOnly(2026, 10, 29);
        EjecucionIngesta primera;
        await using (var db = BaseDeDatos.NuevoContexto())
            primera = await new IngestaFechaSenado(fuente.Cliente(), db, new NormalizadorSenado(db, TimeProvider.System), TimeProvider.System)
                .EjecutarAsync(hoy, CancellationToken.None);

        Assert.Equal(EstadoEjecucion.Exitosa, primera.Estado);
        Assert.Contains("fechaDesde=2026-10-09;ventana=20", primera.Parametros, StringComparison.Ordinal);
        Assert.Equal(["?fecha=08/10/2026", "?fecha=09/10/2026"], fuente.Consultas);
        Assert.Equal(2, primera.RespuestasNuevas);
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var nuevo = await db.Proyectos.SingleAsync(x => x.Boletin == "11929-13");
            Assert.Equal("senado", nuevo.Fuente);
            Assert.Equal("En tramitación", nuevo.EstadoSenado);
            Assert.Equal(8, await db.TramitesSenado.CountAsync(x => x.ProyectoId == nuevo.Id));
            Assert.Equal(2, await db.RespuestasCrudas.CountAsync(x => x.Fuente == "senado"));
            Assert.Equal(49, await db.ObservacionesSenado.CountAsync(x => x.Origen == "base"));
        }

        var repetida = new SenadoPorFechaSimulado(LoteReal());
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var segunda = await new IngestaFechaSenado(repetida.Cliente(), db, new NormalizadorSenado(db, TimeProvider.System), TimeProvider.System)
                .EjecutarAsync(hoy, CancellationToken.None);
            Assert.Equal(0, segunda.RegistrosInsertados + segunda.RegistrosActualizados);
            Assert.Equal(1, segunda.RespuestasNuevas); // La primera respuesta válida usó otra fecha.
        }
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var tercera = await new IngestaFechaSenado(repetida.Cliente(), db, new NormalizadorSenado(db, TimeProvider.System), TimeProvider.System)
                .EjecutarAsync(hoy, CancellationToken.None);
            Assert.Equal((0, 1, 0, 0), (tercera.RespuestasNuevas, tercera.RespuestasRepetidas,
                tercera.RegistrosInsertados, tercera.RegistrosActualizados));
        }

        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var camara = XDocument.Parse(Encoding.UTF8.GetString(Fixtures.Camara("retornarMensajesXAnno-2025.xml")));
            var proyecto = camara.Descendants().First(x => x.Name.LocalName == "ProyectoLey");
            proyecto.Elements().First(x => x.Name.LocalName == "NumeroBoletin").Value = "11929-13";
            proyecto.Elements().First(x => x.Name.LocalName == "Id").Value = "99999";
            var contenedor = proyecto.Parent!;
            foreach (var otro in contenedor.Elements().Where(x => x != proyecto).ToList()) otro.Remove();
            var cruda = new RespuestaCruda
            {
                Fuente = "camara", Operacion = "retornarMensajesXAnno", Parametros = "anno=2025-prueba",
                Url = "https://opendata.camara.cl/prueba", FechaConsulta = DateTimeOffset.UtcNow,
                EstadoHttp = 200, Hash = new string('a', 64), Contenido = camara.ToString(),
                EjecucionId = (await db.Ejecuciones.FirstAsync()).Id,
            };
            db.RespuestasCrudas.Add(cruda);
            await db.SaveChangesAsync();
            var resultado = await new NormalizadorProyectos(db, TimeProvider.System).NormalizarAsync(cruda, CancellationToken.None);
            Assert.Equal(1, resultado.Actualizados);
            var actualizado = await db.Proyectos.SingleAsync(x => x.Boletin == "11929-13");
            Assert.Equal("camara", actualizado.Fuente);
            Assert.Equal("En tramitación", actualizado.EstadoSenado);
            Assert.Equal(8, await db.TramitesSenado.CountAsync(x => x.ProyectoId == actualizado.Id));
        }
    }

    [FactConBaseDatos]
    public async Task LoteIncompletoGuardaRespuestaFallidaSinCrearProyectos()
    {
        var xml = XDocument.Parse(Encoding.UTF8.GetString(LoteReal()));
        xml.Root!.Elements().Last().Element("tramitacion")!.Remove();
        var fuente = new SenadoPorFechaSimulado(Encoding.UTF8.GetBytes(xml.ToString()));
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            var ingesta = new IngestaFechaSenado(fuente.Cliente(), db,
                new NormalizadorSenado(db, TimeProvider.System), TimeProvider.System);
            await Assert.ThrowsAsync<FuenteSenadoException>(() =>
                ingesta.EjecutarAsync(new DateOnly(2026, 10, 29), CancellationToken.None));
        }
        await using (var db = BaseDeDatos.NuevoContexto())
        {
            Assert.Equal(EstadoEjecucion.Fallida, (await db.Ejecuciones.SingleAsync()).Estado);
            Assert.Single(await db.RespuestasCrudas.ToListAsync());
            Assert.Equal(0, await db.Proyectos.CountAsync());
            Assert.Equal(0, await db.TramitesSenado.CountAsync());
        }
    }

    private sealed class SenadoPorFechaSimulado(params byte[][] respuestas) : HttpMessageHandler
    {
        private int indice;
        public List<string> Consultas { get; } = [];
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Consultas.Add(request.RequestUri!.Query);
            var respuesta = respuestas[Math.Min(indice++, respuestas.Length - 1)];
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(respuesta) });
        }
        public ClienteSenado Cliente() => new(new HttpClient(this, disposeHandler: false),
            Options.Create(new OpcionesSenado { Intentos = 1 }), TimeProvider.System,
            NullLogger<ClienteSenado>.Instance);
    }
}
