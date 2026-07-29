namespace Myth4Ever5.Api.Core.Services;

using Myth4Ever5.Api.Core.Interfaces;

public class GameEngineFactory
{
    private readonly Dictionary<string, IGameEngine> _engines = new();

    public GameEngineFactory(IEnumerable<IGameEngine> engines)
    {
        foreach (var engine in engines)
        {
            _engines[engine.GameTypeId] = engine;
        }
    }

    public IGameEngine? GetEngine(string gameTypeId)
    {
        _engines.TryGetValue(gameTypeId, out var engine);
        return engine;
    }

    public IEnumerable<IGameEngine> GetAllEngines() => _engines.Values;
}
