namespace Myth4Ever5.Api.Games.HexaHive.Models;

public readonly struct HexCoord : IEquatable<HexCoord>
{
    public int Q { get; }
    public int R { get; }
    public int S => -Q - R;

    public HexCoord(int q, int r)
    {
        Q = q;
        R = r;
    }

    public static readonly HexCoord[] Directions = new[]
    {
        new HexCoord(1, 0),
        new HexCoord(1, -1),
        new HexCoord(0, -1),
        new HexCoord(-1, 0),
        new HexCoord(-1, 1),
        new HexCoord(0, 1)
    };

    public IEnumerable<HexCoord> GetNeighbors()
    {
        foreach (var dir in Directions)
        {
            yield return new HexCoord(Q + dir.Q, R + dir.R);
        }
    }

    public static HexCoord operator +(HexCoord a, HexCoord b) => new(a.Q + b.Q, a.R + b.R);
    public static HexCoord operator -(HexCoord a, HexCoord b) => new(a.Q - b.Q, a.R - b.R);
    public static bool operator ==(HexCoord a, HexCoord b) => a.Q == b.Q && a.R == b.R;
    public static bool operator !=(HexCoord a, HexCoord b) => !(a == b);

    public int DistanceTo(HexCoord other)
    {
        return (Math.Abs(Q - other.Q) + Math.Abs(R - other.R) + Math.Abs(S - other.S)) / 2;
    }

    public override bool Equals(object? obj) => obj is HexCoord other && Equals(other);
    public bool Equals(HexCoord other) => Q == other.Q && R == other.R;
    public override int GetHashCode() => HashCode.Combine(Q, R);
    public override string ToString() => $"{Q},{R}";

    public static HexCoord Parse(string key)
    {
        var parts = key.Split(',');
        return new HexCoord(int.Parse(parts[0]), int.Parse(parts[1]));
    }
}
