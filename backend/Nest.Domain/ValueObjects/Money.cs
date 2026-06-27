namespace Nest.Domain.ValueObjects;

public sealed class Money : IEquatable<Money>
{
    public decimal Amount { get; }
    public Currency Currency { get; }

    public Money(decimal amount, Currency currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public Money(decimal amount, string currencyCode)
        : this(amount, Currency.FromCode(currencyCode)) { }

    // ── Arithmetic ────────────────────────────────────────────────────────────

    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new(a.Amount + b.Amount, a.Currency);
    }

    public static Money operator -(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new(a.Amount - b.Amount, a.Currency);
    }

    public static Money operator *(Money a, decimal factor) => new(a.Amount * factor, a.Currency);
    public static Money operator *(decimal factor, Money a) => a * factor;
    public static Money operator -(Money a) => new(-a.Amount, a.Currency);

    // ── Comparison ────────────────────────────────────────────────────────────

    public static bool operator >(Money a, Money b) { EnsureSameCurrency(a, b); return a.Amount > b.Amount; }
    public static bool operator <(Money a, Money b) { EnsureSameCurrency(a, b); return a.Amount < b.Amount; }
    public static bool operator >=(Money a, Money b) { EnsureSameCurrency(a, b); return a.Amount >= b.Amount; }
    public static bool operator <=(Money a, Money b) { EnsureSameCurrency(a, b); return a.Amount <= b.Amount; }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public Money Abs() => new(Math.Abs(Amount), Currency);
    public bool IsNegative => Amount < 0;
    public bool IsPositive => Amount > 0;
    public bool IsZero => Amount == 0;

    // ── Equality ──────────────────────────────────────────────────────────────

    public bool Equals(Money? other) => other is not null && Amount == other.Amount && Currency == other.Currency;
    public override bool Equals(object? obj) => obj is Money m && Equals(m);
    public override int GetHashCode() => HashCode.Combine(Amount, Currency);
    public static bool operator ==(Money? a, Money? b) => a?.Equals(b) ?? b is null;
    public static bool operator !=(Money? a, Money? b) => !(a == b);

    public override string ToString() => $"{Currency.Symbol}{Amount.ToString($"F{Currency.DecimalPlaces}")}";

    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException($"Currency mismatch: {a.Currency} and {b.Currency}");
    }
}
