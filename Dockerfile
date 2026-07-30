# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy the entire workspace
COPY . .

# Publish the backend
WORKDIR /app/Backend/Myth4Ever5.Api
RUN dotnet publish -c Release -o /app/publish

# Run Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app/Backend/Myth4Ever5.Api

# Copy the published backend
COPY --from=build /app/publish .

# Copy the frontend so relative path "../../Frontend" works
COPY --from=build /app/Frontend /app/Frontend

# Start the application
ENTRYPOINT ["dotnet", "Myth4Ever5.Api.dll"]
