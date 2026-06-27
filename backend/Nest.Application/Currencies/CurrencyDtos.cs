namespace Nest.Application.Currencies;

/// <summary>Carries an amount together with its currency and the workspace-configured decimal places.</summary>
public record MoneyDto(decimal Amount, string CurrencyCode, int DecimalPlaces);

/// <summary>A workspace-configured currency entry.</summary>
public record CurrencyDto(string Code, string Symbol, int DecimalPlaces, bool IsDefault);

public record UpsertCurrencyRequest(string Symbol, int DecimalPlaces, bool IsDefault);
public record AddCurrencyRequest(string Code, string Symbol, int DecimalPlaces, bool IsDefault);
