# Sử dụng base image .NET 9.0 SDK để build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy file csproj và restore các dependencies
COPY ["Myth4Ever5.Api.csproj", "./"]
RUN dotnet restore "./Myth4Ever5.Api.csproj"

# Copy toàn bộ mã nguồn
COPY . .

# Build và Publish
RUN dotnet publish "Myth4Ever5.Api.csproj" -c Release -o /app/publish

# Chuyển sang base image .NET 9.0 ASP.NET (nhỏ gọn hơn) để chạy
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Render tự động sử dụng biến môi trường PORT, ASP.NET Core mặc định nghe ở port 8080 trong docker
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Myth4Ever5.Api.dll"]
