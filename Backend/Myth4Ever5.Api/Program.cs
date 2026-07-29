using Myth4Ever5.Api.Core.Hubs;
using Myth4Ever5.Api.Core.Interfaces;
using Myth4Ever5.Api.Core.Services;
using Myth4Ever5.Api.Games.MythicCards;

var builder = WebApplication.CreateBuilder(args);

// 1. Thêm dịch vụ CORS cho phép kết nối từ Frontend
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

// 2. Thêm dịch vụ SignalR
builder.Services.AddSignalR();

// 3. Đăng ký các Singleton Services & Game Engines
builder.Services.AddSingleton<RoomManager>();
builder.Services.AddSingleton<IGameEngine, MythicCardsEngine>();
builder.Services.AddSingleton<GameEngineFactory>();

var app = builder.Build();

app.UseCors("AllowAll");

// 4. Map SignalR Hub Endpoint
app.MapHub<PartyHub>("/hubs/party");

app.MapGet("/", () => "Myth4Ever5 Real-time Game Server is Running!");

app.Run();
