# Imágenes de la API y de la ingesta. Uso: docker build --target api|ingesta .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS compilacion
WORKDIR /fuente
# Primero solo lo necesario para restaurar, para aprovechar la caché de capas.
COPY global.json Directory.Build.props Directory.Packages.props Observatorio.slnx ./
COPY src/Observatorio.Dominio/Observatorio.Dominio.csproj src/Observatorio.Dominio/
COPY src/Observatorio.Datos/Observatorio.Datos.csproj src/Observatorio.Datos/
COPY src/Observatorio.Fuentes.Camara/Observatorio.Fuentes.Camara.csproj src/Observatorio.Fuentes.Camara/
COPY src/Observatorio.Fuentes.Senado/Observatorio.Fuentes.Senado.csproj src/Observatorio.Fuentes.Senado/
COPY src/Observatorio.Ingesta/Observatorio.Ingesta.csproj src/Observatorio.Ingesta/
COPY src/Observatorio.Api/Observatorio.Api.csproj src/Observatorio.Api/
RUN dotnet restore src/Observatorio.Api/Observatorio.Api.csproj \
 && dotnet restore src/Observatorio.Ingesta/Observatorio.Ingesta.csproj
COPY src/ src/
RUN dotnet publish src/Observatorio.Api/Observatorio.Api.csproj -c Release --no-restore -o /salida/api \
 && dotnet publish src/Observatorio.Ingesta/Observatorio.Ingesta.csproj -c Release --no-restore -o /salida/ingesta

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS api
WORKDIR /app
COPY --from=compilacion /salida/api .
RUN chmod -R a+rX /app
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Observatorio.Api.dll"]

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS ingesta
WORKDIR /app
COPY --from=compilacion /salida/ingesta .
COPY datos/referencia/titulos-boletines-1990-2026.csv /app/referencia/titulos-boletines-1990-2026.csv
COPY datos/referencia/parlamentarios-bcn.csv datos/referencia/alias-autores.csv /app/referencia/
RUN chmod -R a+rX /app
USER $APP_UID
ENTRYPOINT ["dotnet", "Observatorio.Ingesta.dll"]
