using Microsoft.EntityFrameworkCore;
using Observatorio.Dominio;

namespace Observatorio.Datos;

/// <summary>
/// Acceso a datos. El esquema lo crean y versionan las migraciones de Liquibase (db/changelog);
/// este mapeo solo lo describe. No se usan migraciones de Entity Framework (decisión 0002).
/// </summary>
public class ObservatorioDbContext(DbContextOptions<ObservatorioDbContext> options) : DbContext(options)
{
    public DbSet<EjecucionIngesta> Ejecuciones => Set<EjecucionIngesta>();
    public DbSet<RespuestaCruda> RespuestasCrudas => Set<RespuestaCruda>();
    public DbSet<ProyectoLey> Proyectos => Set<ProyectoLey>();
    public DbSet<TipoIniciativa> TiposIniciativa => Set<TipoIniciativa>();
    public DbSet<Camara> Camaras => Set<Camara>();
    public DbSet<Parlamentario> Parlamentarios => Set<Parlamentario>();
    public DbSet<ProyectoAutor> ProyectoAutores => Set<ProyectoAutor>();
    public DbSet<TramiteSenado> TramitesSenado => Set<TramiteSenado>();
    public DbSet<ObservacionTramiteSenado> ObservacionesSenado => Set<ObservacionTramiteSenado>();
    public DbSet<DesactualizacionSenado> DesactualizacionesSenado => Set<DesactualizacionSenado>();
    public DbSet<FuenteEstado> EstadosFuentes => Set<FuenteEstado>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.Entity<EjecucionIngesta>(e =>
        {
            e.ToTable("ingesta_ejecucion");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Proceso).HasColumnName("proceso");
            e.Property(x => x.Parametros).HasColumnName("parametros");
            e.Property(x => x.EjecucionPadreId).HasColumnName("ejecucion_padre_id");
            e.Property(x => x.Inicio).HasColumnName("inicio");
            e.Property(x => x.Termino).HasColumnName("termino");
            e.Property(x => x.Estado).HasColumnName("estado").HasConversion<short>();
            e.Property(x => x.RespuestasNuevas).HasColumnName("respuestas_nuevas");
            e.Property(x => x.RespuestasRepetidas).HasColumnName("respuestas_repetidas");
            e.Property(x => x.RegistrosInsertados).HasColumnName("registros_insertados");
            e.Property(x => x.RegistrosActualizados).HasColumnName("registros_actualizados");
            e.Property(x => x.RegistrosSinCambio).HasColumnName("registros_sin_cambio");
            e.Property(x => x.Detalle).HasColumnName("detalle");
        });

        modelBuilder.Entity<RespuestaCruda>(e =>
        {
            e.ToTable("respuesta_cruda");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Fuente).HasColumnName("fuente");
            e.Property(x => x.Operacion).HasColumnName("operacion");
            e.Property(x => x.Parametros).HasColumnName("parametros");
            e.Property(x => x.Url).HasColumnName("url");
            e.Property(x => x.FechaConsulta).HasColumnName("fecha_consulta");
            e.Property(x => x.EstadoHttp).HasColumnName("estado_http");
            e.Property(x => x.Hash).HasColumnName("hash").IsFixedLength();
            e.Property(x => x.Contenido).HasColumnName("contenido");
            e.Property(x => x.EjecucionId).HasColumnName("ejecucion_id");
            e.HasIndex(x => new { x.Fuente, x.Operacion, x.Parametros, x.Hash }).IsUnique();
        });

        modelBuilder.Entity<TipoIniciativa>(e =>
        {
            e.ToTable("tipo_iniciativa");
            e.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(x => x.Nombre).HasColumnName("nombre");
        });

        modelBuilder.Entity<Camara>(e =>
        {
            e.ToTable("camara");
            e.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();
            e.Property(x => x.Nombre).HasColumnName("nombre");
        });

        modelBuilder.Entity<ProyectoLey>(e =>
        {
            e.ToTable("proyecto_ley");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Boletin).HasColumnName("boletin");
            e.Property(x => x.Titulo).HasColumnName("titulo");
            e.Property(x => x.FechaIngreso).HasColumnName("fecha_ingreso");
            e.Property(x => x.TipoIniciativaId).HasColumnName("tipo_iniciativa_id");
            e.Property(x => x.CamaraOrigenId).HasColumnName("camara_origen_id");
            e.Property(x => x.Admisible).HasColumnName("admisible");
            e.Property(x => x.Fuente).HasColumnName("fuente");
            e.Property(x => x.IdOrigen).HasColumnName("id_origen");
            e.Property(x => x.RespuestaCrudaId).HasColumnName("respuesta_cruda_id");
            e.Property(x => x.FechaConsulta).HasColumnName("fecha_consulta");
            e.Property(x => x.HashContenido).HasColumnName("hash_contenido").IsFixedLength();
            e.Property(x => x.Creado).HasColumnName("creado");
            e.Property(x => x.Actualizado).HasColumnName("actualizado");
            e.Property(x => x.EstadoSenado).HasColumnName("estado_senado");
            e.Property(x => x.EtapaSenado).HasColumnName("etapa_senado");
            e.Property(x => x.SubetapaSenado).HasColumnName("subetapa_senado");
            e.Property(x => x.RespuestaSenadoId).HasColumnName("respuesta_senado_id");
            e.Property(x => x.FechaConsultaSenado).HasColumnName("fecha_consulta_senado");
            e.Property(x => x.HashSenado).HasColumnName("hash_senado").IsFixedLength();
            e.HasIndex(x => x.Boletin).IsUnique();
            e.HasOne(x => x.TipoIniciativa).WithMany().HasForeignKey(x => x.TipoIniciativaId);
            e.HasOne(x => x.CamaraOrigen).WithMany().HasForeignKey(x => x.CamaraOrigenId);
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaCrudaId);
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaSenadoId);
            e.HasMany(x => x.Autores).WithOne().HasForeignKey(x => x.ProyectoId);
            e.HasMany(x => x.TramitesSenado).WithOne().HasForeignKey(x => x.ProyectoId);
            e.HasMany(x => x.ObservacionesSenado).WithOne().HasForeignKey(x => x.ProyectoId);
        });

        modelBuilder.Entity<TramiteSenado>(e =>
        {
            e.ToTable("tramite_senado");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProyectoId).HasColumnName("proyecto_id");
            e.Property(x => x.Posicion).HasColumnName("posicion");
            e.Property(x => x.Fecha).HasColumnName("fecha");
            e.Property(x => x.Sesion).HasColumnName("sesion");
            e.Property(x => x.Descripcion).HasColumnName("descripcion");
            e.Property(x => x.Etapa).HasColumnName("etapa");
            e.Property(x => x.Camara).HasColumnName("camara");
            e.Property(x => x.RespuestaCrudaId).HasColumnName("respuesta_cruda_id");
            e.HasIndex(x => new { x.ProyectoId, x.Posicion }).IsUnique();
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaCrudaId);
        });

        modelBuilder.Entity<ObservacionTramiteSenado>(e =>
        {
            e.ToTable("senado_observacion");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProyectoId).HasColumnName("proyecto_id");
            e.Property(x => x.Huella).HasColumnName("huella").IsFixedLength();
            e.Property(x => x.FechaTramite).HasColumnName("fecha_tramite");
            e.Property(x => x.PrimeraVista).HasColumnName("primera_vista");
            e.Property(x => x.RetrasoDias).HasColumnName("retraso_dias");
            e.Property(x => x.Origen).HasColumnName("origen");
            e.Property(x => x.RespuestaCrudaId).HasColumnName("respuesta_cruda_id");
            e.HasIndex(x => new { x.ProyectoId, x.Huella }).IsUnique();
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaCrudaId);
        });

        modelBuilder.Entity<DesactualizacionSenado>(e =>
        {
            e.ToTable("senado_desactualizacion");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProyectoId).HasColumnName("proyecto_id");
            e.Property(x => x.EjecucionId).HasColumnName("ejecucion_id");
            e.Property(x => x.RespuestaCrudaId).HasColumnName("respuesta_cruda_id");
            e.Property(x => x.Detectado).HasColumnName("detectado");
            e.Property(x => x.UltimaConfirmacion).HasColumnName("ultima_confirmacion");
            e.Property(x => x.Insertados).HasColumnName("insertados");
            e.Property(x => x.Actualizados).HasColumnName("actualizados");
            e.Property(x => x.HashAnterior).HasColumnName("hash_anterior").IsFixedLength();
            e.Property(x => x.HashActual).HasColumnName("hash_actual").IsFixedLength();
            e.HasIndex(x => new { x.EjecucionId, x.ProyectoId }).IsUnique();
            e.HasOne(x => x.Proyecto).WithMany().HasForeignKey(x => x.ProyectoId);
            e.HasOne<EjecucionIngesta>().WithMany().HasForeignKey(x => x.EjecucionId);
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaCrudaId);
        });

        modelBuilder.Entity<FuenteEstado>(e =>
        {
            e.ToTable("fuente_estado");
            e.HasKey(x => x.Fuente);
            e.Property(x => x.Fuente).HasColumnName("fuente");
            e.Property(x => x.Estado).HasColumnName("estado");
            e.Property(x => x.UltimaDiaria).HasColumnName("ultima_diaria");
            e.Property(x => x.UltimaCompleta).HasColumnName("ultima_completa");
            e.Property(x => x.UltimaRespuesta).HasColumnName("ultima_respuesta");
            e.Property(x => x.UltimoError).HasColumnName("ultimo_error");
            e.Property(x => x.Actualizado).HasColumnName("actualizado");
        });

        modelBuilder.Entity<Parlamentario>(e =>
        {
            e.ToTable("parlamentario");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Fuente).HasColumnName("fuente");
            e.Property(x => x.CamaraId).HasColumnName("camara_id");
            e.Property(x => x.IdOrigen).HasColumnName("id_origen");
            e.Property(x => x.Nombre).HasColumnName("nombre");
            e.Property(x => x.ApellidoPaterno).HasColumnName("apellido_paterno");
            e.Property(x => x.ApellidoMaterno).HasColumnName("apellido_materno");
            e.Property(x => x.Creado).HasColumnName("creado");
            e.Property(x => x.Actualizado).HasColumnName("actualizado");
            e.HasIndex(x => new { x.Fuente, x.CamaraId, x.IdOrigen }).IsUnique();
            e.HasOne(x => x.Camara).WithMany().HasForeignKey(x => x.CamaraId);
        });

        modelBuilder.Entity<ProyectoAutor>(e =>
        {
            e.ToTable("proyecto_autor");
            e.HasKey(x => new { x.ProyectoId, x.ParlamentarioId });
            e.Property(x => x.ProyectoId).HasColumnName("proyecto_id");
            e.Property(x => x.ParlamentarioId).HasColumnName("parlamentario_id");
            e.Property(x => x.Orden).HasColumnName("orden");
            e.Property(x => x.RespuestaCrudaId).HasColumnName("respuesta_cruda_id");
            e.HasOne(x => x.Parlamentario).WithMany().HasForeignKey(x => x.ParlamentarioId);
            e.HasOne<RespuestaCruda>().WithMany().HasForeignKey(x => x.RespuestaCrudaId);
        });
    }
}
