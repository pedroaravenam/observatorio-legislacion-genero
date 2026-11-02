using Microsoft.EntityFrameworkCore;
using Observatorio.Api;
using Observatorio.Datos;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddObservatorioDatos(
    builder.Configuration.GetConnectionString("Observatorio")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Observatorio."));
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

app.MapGet("/salud", async (ObservatorioDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct)
        ? Results.Ok(new { estado = "ok" })
        : Results.Problem("Sin conexión a la base de datos.", statusCode: StatusCodes.Status503ServiceUnavailable));

app.MapearProyectos();

await app.RunAsync();
