using Microsoft.EntityFrameworkCore;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;

namespace Nest.Api.Helpers;

internal static class CurrencyHelper
{
    /// <summary>Loads decimal-places map for a workspace (code → decimals). Falls back to 2.</summary>
    internal static async Task<Dictionary<string, int>> LoadDecimalsAsync(INestDbContext db, Guid workspaceId) =>
        await db.WorkspaceCurrencies
            .Where(c => c.WorkspaceId == workspaceId)
            .ToDictionaryAsync(c => c.Code, c => c.DecimalPlaces);

    /// <summary>Loads the default currency code for a workspace. Returns "USD" if none configured.</summary>
    internal static async Task<string> LoadDefaultCodeAsync(INestDbContext db, Guid workspaceId) =>
        await db.WorkspaceCurrencies
            .Where(c => c.WorkspaceId == workspaceId && c.IsDefault)
            .Select(c => c.Code)
            .FirstOrDefaultAsync() ?? "USD";

    internal static MoneyDto ToMoney(decimal amount, string code, Dictionary<string, int> decimals) =>
        new(amount, code, decimals.GetValueOrDefault(code, 2));

    internal static MoneyDto? ToMoney(decimal? amount, string code, Dictionary<string, int> decimals) =>
        amount.HasValue ? new(amount.Value, code, decimals.GetValueOrDefault(code, 2)) : null;
}
