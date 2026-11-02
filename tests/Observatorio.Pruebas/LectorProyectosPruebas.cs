using System.Text;
using Observatorio.Fuentes.Camara;

namespace Observatorio.Pruebas;

public class LectorProyectosPruebas
{
    [Fact]
    public void LeeLaListaRealDeMensajes()
    {
        var proyectos = LectorProyectos.LeerLista(Fixtures.Camara("retornarMensajesXAnno-2025.xml"), "retornarMensajesXAnno");

        Assert.Equal(65, proyectos.Count);
        var p = Assert.Single(proyectos, x => x.Boletin == "17641-13");
        Assert.Equal("18286", p.IdOrigen);
        Assert.Equal("Crea un nuevo sistema de subsidio unificado al empleo", p.Titulo);
        Assert.Equal(new DateOnly(2025, 7, 1), p.FechaIngreso);
        Assert.Equal((1, "Mensaje"), (p.TipoIniciativaCodigo, p.TipoIniciativaNombre));
        Assert.Equal((1, "Cámara de Diputados"), (p.CamaraOrigenCodigo, p.CamaraOrigenNombre));
        Assert.True(p.Admisible);
    }

    [Fact]
    public void LeeLaListaRealDeMociones()
    {
        var proyectos = LectorProyectos.LeerLista(Fixtures.Camara("retornarMocionesXAnno-2025.xml"), "retornarMocionesXAnno");

        Assert.Equal(642, proyectos.Count);
        Assert.All(proyectos, p => Assert.Equal(2, p.TipoIniciativaCodigo));
        Assert.Equal(proyectos.Count, proyectos.Select(p => p.Boletin).Distinct().Count());
    }

    [Fact]
    public void DecodificaLasEntidadesQueLaFuenteEscapaDosVeces()
    {
        // En el original: Declara el 8 de diciembre ... como el &amp;quot;Día Nacional ...&amp;quot;
        var proyectos = LectorProyectos.LeerLista(Fixtures.Camara("retornarMocionesXAnno-2025.xml"), "retornarMocionesXAnno");

        var p = Assert.Single(proyectos, x => x.Boletin == "17348-37");
        Assert.Contains("\"Día Nacional para la Conmemoración", p.Titulo, StringComparison.Ordinal);
        Assert.DoesNotContain("&quot;", p.Titulo, StringComparison.Ordinal);
    }

    [Fact]
    public void ResultadoVacioEsUnaListaVacia()
    {
        var xml = Sobre("<retornarMensajesXAnnoResponse xmlns=\"http://opendata.camara.cl/camaradiputados/v1\"><retornarMensajesXAnnoResult /></retornarMensajesXAnnoResponse>");

        Assert.Empty(LectorProyectos.LeerLista(xml, "retornarMensajesXAnno"));
    }

    [Fact]
    public void UnFaultEsUnError()
    {
        var xml = Sobre("<soap:Fault><faultcode>soap:Server</faultcode><faultstring>Error interno</faultstring></soap:Fault>");

        var ex = Assert.Throws<ContratoFuenteException>(() => LectorProyectos.LeerLista(xml, "retornarMensajesXAnno"));
        Assert.Contains("Error interno", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void UnaRespuestaDeOtraOperacionEsUnError()
    {
        var xml = Sobre("<otraCosaResponse xmlns=\"http://opendata.camara.cl/camaradiputados/v1\" />");

        Assert.Throws<ContratoFuenteException>(() => LectorProyectos.LeerLista(xml, "retornarMensajesXAnno"));
    }

    [Fact]
    public void UnProyectoSinBoletinEsUnError()
    {
        var xml = Sobre("""
            <retornarMensajesXAnnoResponse xmlns="http://opendata.camara.cl/camaradiputados/v1"><retornarMensajesXAnnoResult>
              <ProyectoLey><Id>1</Id><Nombre>X</Nombre><FechaIngreso>2025-01-01T00:00:00</FechaIngreso>
                <TipoIniciativa Valor="1">Mensaje</TipoIniciativa><CamaraOrigen Valor="1">Cámara</CamaraOrigen></ProyectoLey>
            </retornarMensajesXAnnoResult></retornarMensajesXAnnoResponse>
            """);

        var ex = Assert.Throws<ContratoFuenteException>(() => LectorProyectos.LeerLista(xml, "retornarMensajesXAnno"));
        Assert.Contains("NumeroBoletin", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ElSobreEscapaLosParametros()
    {
        var sobre = ClienteSoapCamara.ArmarSobre("retornarProyectoLey", [new("prmNumeroBoletin", "1<2&3")]);

        Assert.Contains("<prmNumeroBoletin>1&lt;2&amp;3</prmNumeroBoletin>", sobre, StringComparison.Ordinal);
        Assert.Contains("<retornarProyectoLey xmlns=\"http://opendata.camara.cl/camaradiputados/v1\">", sobre, StringComparison.Ordinal);
    }

    private static byte[] Sobre(string cuerpo) => Encoding.UTF8.GetBytes(
        $"<?xml version=\"1.0\" encoding=\"utf-8\"?><soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"><soap:Body>{cuerpo}</soap:Body></soap:Envelope>");
}
