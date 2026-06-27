namespace Nest.Application.Currencies;

public record MoneyDto(decimal Amount, string CurrencyCode);

/// <summary>A workspace-configured currency entry.</summary>
public record CurrencyDto(string Code, string Symbol, int DecimalPlaces, bool IsDefault);

public record UpsertCurrencyRequest(string Symbol, int DecimalPlaces, bool IsDefault);
public record AddCurrencyRequest(string Code, string Symbol, int DecimalPlaces, bool IsDefault);
