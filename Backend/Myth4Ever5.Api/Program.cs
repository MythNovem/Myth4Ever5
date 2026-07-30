using Myth4Ever5.Api.Core.Hubs;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Services;
using Myth4Ever5.Api.Games.MythicCards;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Bind to PORT assigned by Render / Cloud host (default 5000 for local)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// 1. CORS — cho phép mọi origin (dev mode)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 2. SignalR
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// 3. Services & Game Engines
builder.Services.AddSingleton<RoomManager>();
builder.Services.AddSingleton<GameEngineFactory>();

// Auto-discover and register all IGameEngine implementations.
// Adding a new game = create a class implementing IGameEngine — no changes needed here.
var engineTypes = typeof(Program).Assembly.GetTypes()
    .Where(t => typeof(IGameEngine).IsAssignableFrom(t) && !t.IsInterface && !t.IsAbstract);
foreach (var engineType in engineTypes)
    builder.Services.AddSingleton(typeof(IGameEngine), engineType);

var app = builder.Build();

app.UseCors("AllowAll");

// 4. Phục vụ Frontend static files (HTML, CSS, JS)
//    Thư mục Frontend nằm song song với thư mục Backend/Myth4Ever5.Api
var frontendPath = Path.GetFullPath(
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "Frontend")
);

if (Directory.Exists(frontendPath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new PhysicalFileProvider(frontendPath),
        RequestPath  = ""
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(frontendPath),
        RequestPath  = ""
    });

    Console.WriteLine($"[Myth4Ever5] Frontend: {frontendPath}");
}
else
{
    Console.WriteLine($"[Myth4Ever5] ⚠ Không tìm thấy Frontend tại: {frontendPath}");
}

// 5. SignalR Hub
app.MapHub<PartyHub>("/hubs/party");

app.Run();
