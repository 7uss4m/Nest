namespace Nest.Domain.ValueObjects;

public sealed class Currency
{
    public string Code { get; }
    public string Symbol { get; }
    public int DecimalPlaces { get; }

    private Currency(string code, string symbol, int decimalPlaces)
    {
        Code = code;
        Symbol = symbol;
        DecimalPlaces = decimalPlaces;
    }

    // ── Well-known defaults ───────────────────────────────────────────────────

    public static readonly Currency USD = new("USD", "$", 2);
    public static readonly Currency EUR = new("EUR", "€", 2);
    public static readonly Currency SYP = new("SYP", "ل.س", 0);

    private static readonly Dictionary<string, Currency> _known = new()
    {
        [USD.Code] = USD,
        [EUR.Code] = EUR,
        [SYP.Code] = SYP,
    };

    public static Currency FromCode(string code, string? symbol = null, int? decimalPlaces = null)
    {
        var upper = code.ToUpperInvariant();
        if (_known.TryGetValue(upper, out var known) && symbol is null && decimalPlaces is null)
            return known;
        return new Currency(upper, symbol ?? (known?.Symbol ?? upper), decimalPlaces ?? known?.DecimalPlaces ?? 2);
    }

    // ── Equality ──────────────────────────────────────────────────────────────

    public static bool operator ==(Currency? a, Currency? b) => a?.Code == b?.Code;
    public static bool operator !=(Currency? a, Currency? b) => !(a == b);
    public override bool Equals(object? obj) => obj is Currency c && c.Code == Code;
    public override int GetHashCode() => Code.GetHashCode(StringComparison.Ordinal);
    public override string ToString() => Code;
}
