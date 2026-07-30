using Myth4Ever5.Api.Core.Hubs;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Services;
using Myth4Ever5.Api.Games.MythicCards;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddSignalR();

// 3. Services & Game Engines
builder.Services.AddSingleton<RoomManager>();
builder.Services.AddSingleton<IGameEngine, MythicCardsEngine>();
builder.Services.AddSingleton<GameEngineFactory>();

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
