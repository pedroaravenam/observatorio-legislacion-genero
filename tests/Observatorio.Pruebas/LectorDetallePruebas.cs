using Observatorio.Fuentes.Camara;

namespace Observatorio.Pruebas;

public class LectorDetallePruebas
{
    [Fact]
    public void LeeUnaMocionDeDiputados()
    {
        var d = LectorProyectos.LeerDetalle(Fixtures.Camara("retornarProyectoLey-17353-07.xml"));

        Assert.NotNull(d);
        Assert.Equal("17353-07", d.Proyecto.Boletin);
        var a = Assert.Single(d.Autores);
        Assert.Equal(new AutorFuente(LectorProyectos.CodigoDiputados, "1097", "Eric", "Aedo", "Jeldres", 0), a);
    }

    [Fact]
    public void LosAutoresDeUnaMocionDelSenadoSonSenadores()
    {
        var d = LectorProyectos.LeerDetalle(Fixtures.Camara("retornarProyectoLey-17348-37.xml"));

        Assert.NotNull(d);
        Assert.Equal(5, d.Autores.Count);
        Assert.All(d.Autores, a => Assert.Equal(LectorProyectos.CodigoSenado, a.CamaraCodigo));
        Assert.Contains(d.Autores, a => a is { IdOrigen: "1337", Nombre: "Paulina", ApellidoPaterno: "Núñez" });
    }

    [Fact]
    public void LaPosicionSigueElOrdenDeLaFuenteAunqueSuCampoOrdenVengaEnCero()
    {
        var d = LectorProyectos.LeerDetalle(Fixtures.Camara("retornarProyectoLey-17776-16.xml"));

        Assert.NotNull(d);
        Assert.Equal(Enumerable.Range(0, 10), d.Autores.Select(a => a.Posicion));
        Assert.Equal(("1051", "Claudia"), (d.Autores[0].IdOrigen, d.Autores[0].Nombre));
        Assert.Equal(("1160", "Alejandra"), (d.Autores[9].IdOrigen, d.Autores[9].Nombre));
    }

    [Fact]
    public void UnBoletinInexistenteNoEsUnError()
    {
        // La fuente responde 200 con el elemento de respuesta vacío.
        Assert.Null(LectorProyectos.LeerDetalle(Fixtures.Camara("retornarProyectoLey-99999-99.xml")));
    }
}
