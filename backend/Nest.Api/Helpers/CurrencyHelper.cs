using Microsoft.EntityFrameworkCore;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;

namespace Nest.Api.Helpers;

internal static class CurrencyHelper
{
    internal static async Task<string> LoadDefaultCodeAsync(INestDbContext db, Guid workspaceId) =>
        await db.WorkspaceCurrencies
            .Where(c => c.WorkspaceId == workspaceId && c.IsDefault)
            .Select(c => c.Code)
            .FirstOrDefaultAsync() ?? "USD";

    internal static MoneyDto ToMoney(decimal amount, string code) => new(amount, code);

    internal static MoneyDto? ToMoney(decimal? amount, string code) =>
        amount.HasValue ? new(amount.Value, code) : null;
}
