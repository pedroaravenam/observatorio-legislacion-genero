using Observatorio.Datos;
using Observatorio.Fuentes.Camara;
using Observatorio.Fuentes.Senado;
using Observatorio.Ingesta;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddObservatorioDatos(
    builder.Configuration.GetConnectionString("Observatorio")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Observatorio."));
builder.Services.Configure<OpcionesCamara>(builder.Configuration.GetSection(OpcionesCamara.Seccion));
builder.Services.AddHttpClient<ClienteSoapCamara>(h => h.Timeout = Timeout.InfiniteTimeSpan);
builder.Services.Configure<OpcionesSenado>(builder.Configuration.GetSection(OpcionesSenado.Seccion));
builder.Services.AddHttpClient<ClienteSenado>(h => h.Timeout = Timeout.InfiniteTimeSpan);
builder.Services.AddScoped<NormalizadorProyectos>();
builder.Services.AddScoped<IngestaProyectosCamara>();
builder.Services.AddScoped<IngestaParlamentarios>();
builder.Services.AddScoped<NormalizadorSenado>();
builder.Services.AddScoped<IngestaFichaSenado>();
builder.Services.AddScoped<IngestaFechaSenado>();
builder.Services.Configure<OpcionesCargaSenado>(builder.Configuration.GetSection(OpcionesCargaSenado.Seccion));
builder.Services.AddScoped<IngestaCompletaSenado>();
builder.Services.Configure<OpcionesIngesta>(builder.Configuration.GetSection(OpcionesIngesta.Seccion));
builder.Services.AddHostedService<EjecutorIngesta>();

var host = builder.Build();
await host.RunAsync();
return Environment.ExitCode;
