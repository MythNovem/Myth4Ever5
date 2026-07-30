# Buid Stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy the entire workspace
COPY . .

# Publish the backend
WORKDIR /app/Backend/Myth4Ever5.Api
RUN dotnet publish -c Release -o /app/publish

# Run Stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app/Backend/Myth4Ever5.Api

# Copy the published backend
COPY --from=build /app/publish .

# Copy the frontend so the relative path "../.. /Frontend" works
# The working directory is /app/Backend/Myth4Ever5.Api
# So "../../Frontend" points to /app/Frontend
COPY --from=build /app/Frontend /app/Frontend

# Expose port (Render automatically maps the PORT env var)
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

# Start the application
ENTRYPOINT ["dotnet", "Myth4Ever5.Api.dll"]
