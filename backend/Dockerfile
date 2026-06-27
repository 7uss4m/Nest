FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Nest.slnx .
COPY Nest.Domain/Nest.Domain.csproj Nest.Domain/
COPY Nest.Application/Nest.Application.csproj Nest.Application/
COPY Nest.Infrastructure/Nest.Infrastructure.csproj Nest.Infrastructure/
COPY Nest.Api/Nest.Api.csproj Nest.Api/
RUN dotnet restore

COPY . .
RUN dotnet publish Nest.Api -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Nest.Api.dll"]
