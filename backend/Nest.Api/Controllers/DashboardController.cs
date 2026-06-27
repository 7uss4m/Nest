using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/dashboard")]
[Authorize]
public class DashboardController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    /// <summary>Returns summary statistics for a given month (defaults to current month).</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        Guid workspaceId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] string? baseCurrency = null)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        var from = new DateOnly(y, m, 1);
        var to = from.AddMonths(1);

        var transactions = await db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId && t.Date >= from && t.Date < to)
            .Select(t => new { t.Type, t.Amount, Currency = t.Account.Currency })
            .ToListAsync();

        // Build exchange-rate lookup if baseCurrency requested
        Dictionary<string, decimal> rateToBase = [];
        if (!string.IsNullOrWhiteSpace(baseCurrency))
        {
            var bc = baseCurrency.ToUpper();
            var allRates = await db.ExchangeRates.ToListAsync();
            // Latest rate per pair
            var latestRates = allRates
                .GroupBy(r => (r.BaseCurrency, r.TargetCurrency))
                .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.CreatedAt).First().Rate);

            foreach (var tx in transactions)
            {
                var cur = tx.Currency;
                if (cur == bc || rateToBase.ContainsKey(cur)) continue;
                // Try direct rate: cur → bc
                if (latestRates.TryGetValue((cur, bc), out var directRate))
                    rateToBase[cur] = directRate;
                // Try inverse: bc → cur  ⟹  rate = 1 / inverseRate
                else if (latestRates.TryGetValue((bc, cur), out var inverseRate) && inverseRate != 0)
                    rateToBase[cur] = 1m / inverseRate;
            }
        }

        decimal Convert(decimal amount, string currency) =>
            !string.IsNullOrWhiteSpace(baseCurrency) && rateToBase.TryGetValue(currency, out var r)
                ? amount * r
                : amount;

        var income  = transactions.Where(t => t.Type == TransactionType.Income) .Sum(t => Convert(t.Amount, t.Currency));
        var expense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => Convert(t.Amount, t.Currency));

        var accounts = await db.Accounts
            .Where(a => a.WorkspaceId == workspaceId)
            .Select(a => new { a.Id, a.Name, a.Type, a.Currency, a.Color, a.Icon })
            .ToListAsync();

        var upcomingCutoff = now.AddDays(30);
        var upcoming = await db.PlannedPayments
            .Where(p => p.WorkspaceId == workspaceId && !p.IsPaid && p.DueDate <= upcomingCutoff)
            .OrderBy(p => p.DueDate)
            .Select(p => new { p.Id, p.Name, p.Amount, p.Currency, p.DueDate, p.Icon })
            .Take(5)
            .ToListAsync();

        return Ok(new
        {
            period = new { year = y, month = m },
            income,
            expense,
            saved = income - expense,
            baseCurrency = string.IsNullOrWhiteSpace(baseCurrency) ? null : baseCurrency.ToUpper(),
            accounts,
            upcomingPayments = upcoming,
        });
    }

    /// <summary>Returns month-by-month net worth for the past 12 months.</summary>
    [HttpGet("net-worth-history")]
    public async Task<IActionResult> NetWorthHistory(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var assetHistory = await db.AssetValueHistory
            .Where(h => h.Asset.WorkspaceId == workspaceId)
            .Select(h => new { h.AssetId, h.Value, h.CreatedAt })
            .ToListAsync();

        var liabilityHistory = await db.LiabilityBalanceHistory
            .Where(h => h.Liability.WorkspaceId == workspaceId)
            .Select(h => new { h.LiabilityId, h.Balance, h.CreatedAt })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var result = Enumerable.Range(0, 12).Select(i =>
        {
            var mo = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-11 + i);
            var end = mo.AddMonths(1);

            var assets = assetHistory
                .Where(h => h.CreatedAt < end)
                .GroupBy(h => h.AssetId)
                .Sum(g => g.OrderByDescending(h => h.CreatedAt).First().Value);

            var liabilities = liabilityHistory
                .Where(h => h.CreatedAt < end)
                .GroupBy(h => h.LiabilityId)
                .Sum(g => g.OrderByDescending(h => h.CreatedAt).First().Balance);

            return new { month = mo.ToString("MMM"), assets, liabilities, netWorth = assets - liabilities };
        }).ToList();

        return Ok(result);
    }

    /// <summary>Returns income/expense/saved totals for each of the last N months.</summary>
    [HttpGet("monthly-trends")]
    public async Task<IActionResult> MonthlyTrends(Guid workspaceId, [FromQuery] int months = 12)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var fromDate = new DateOnly(now.Year, now.Month, 1).AddMonths(-(months - 1));

        var transactions = await db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId
                && t.Date >= fromDate
                && (t.Type == TransactionType.Income || t.Type == TransactionType.Expense))
            .Select(t => new { t.Date.Year, t.Date.Month, t.Type, t.Amount })
            .ToListAsync();

        var result = Enumerable.Range(0, months).Select(i =>
        {
            var mo = fromDate.AddMonths(i);
            var monthTxs = transactions.Where(t => t.Year == mo.Year && t.Month == mo.Month);
            var income  = monthTxs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
            var expense = monthTxs.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
            return new
            {
                month    = new DateTime(mo.Year, mo.Month, 1, 0, 0, 0, DateTimeKind.Utc).ToString("MMM yy"),
                year     = mo.Year,
                monthNum = mo.Month,
                income,
                expense,
                saved    = income - expense,
            };
        }).ToList();

        return Ok(result);
    }

    /// <summary>Returns daily expense totals for every day in the given month, optionally filtered by account.</summary>
    [HttpGet("daily-spending")]
    public async Task<IActionResult> DailySpending(
        Guid workspaceId,
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] Guid? accountId = null)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var y = year ?? now.Year;
        var m = month ?? now.Month;
        var from = new DateOnly(y, m, 1);
        var to = from.AddMonths(1).AddDays(-1);

        var query = db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId
                && t.Date >= from && t.Date <= to
                && t.Type == TransactionType.Expense);

        if (accountId.HasValue)
            query = query.Where(t => t.AccountId == accountId.Value);

        var txs = await query
            .Select(t => new { t.Date.Day, t.Amount })
            .ToListAsync();

        var days = Enumerable.Range(1, to.Day).Select(d => new
        {
            day = d,
            total = txs.Where(t => t.Day == d).Sum(t => t.Amount),
        }).ToList();

        return Ok(days);
    }

    /// <summary>Returns a projected end-of-month balance based on current account totals, pending planned payments, and recurring rules yet to fire.</summary>
    [HttpGet("projected-balance")]
    public async Task<IActionResult> ProjectedBalance(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthEnd = new DateOnly(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));

        // Current net balance = all-time income minus all-time expense (transfers are internal, net zero)
        var allTx = await db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId
                && (t.Type == TransactionType.Income || t.Type == TransactionType.Expense))
            .Select(t => new { t.Type, t.Amount })
            .ToListAsync();

        var currentBalance = allTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
            - allTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

        // Planned payments due by end of month (not yet paid)
        var plannedExpenses = await db.PlannedPayments
            .Where(p => p.WorkspaceId == workspaceId && !p.IsPaid && p.DueDate >= now && p.DueDate <= monthEnd)
            .Select(p => new { p.Name, p.Amount, p.DueDate })
            .ToListAsync();

        // Recurring rules that will fire between tomorrow and end of month
        var recurringItems = await db.RecurringRules
            .Include(r => r.Transaction)
            .Where(r => r.Transaction.Account.WorkspaceId == workspaceId
                && DateOnly.FromDateTime(r.NextOccurrence) > now
                && DateOnly.FromDateTime(r.NextOccurrence) <= monthEnd)
            .Select(r => new
            {
                r.Transaction.Type,
                r.Transaction.Amount,
                NextDate = DateOnly.FromDateTime(r.NextOccurrence),
            })
            .ToListAsync();

        var plannedExpenseTotal = plannedExpenses.Sum(p => p.Amount);
        var recurringIncome = recurringItems.Where(r => r.Type == TransactionType.Income).Sum(r => r.Amount);
        var recurringExpense = recurringItems.Where(r => r.Type == TransactionType.Expense).Sum(r => r.Amount);

        var projected = currentBalance + recurringIncome - recurringExpense - plannedExpenseTotal;

        return Ok(new
        {
            currentBalance,
            plannedExpenseTotal,
            recurringIncome,
            recurringExpense,
            projectedBalance = projected,
            plannedPayments = plannedExpenses,
            daysRemaining = monthEnd.DayNumber - now.DayNumber,
        });
    }

    /// <summary>Returns recent workspace activity (last 50 events).</summary>
    [HttpGet("activity")]
    public async Task<IActionResult> Activity(Guid workspaceId, [FromQuery] int limit = 50)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var events = await db.ActivityLogs
            .Where(a => a.WorkspaceId == workspaceId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(Math.Min(limit, 100))
            .Select(a => new
            {
                a.Id,
                a.Action,
                a.Description,
                a.UserName,
                a.UserId,
                a.EntityId,
                a.EntityType,
                a.CreatedAt,
            })
            .ToListAsync();

        return Ok(events);
    }

    /// <summary>Returns spending grouped by category for a given month, optionally filtered by account.</summary>
    [HttpGet("spending-by-category")]
    public async Task<IActionResult> SpendingByCategory(
        Guid workspaceId,
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] Guid? accountId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var now = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = new DateOnly(year ?? now.Year, month ?? now.Month, 1);
        var to = from.AddMonths(1);

        var query = db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId
                && t.Type == TransactionType.Expense
                && t.Date >= from && t.Date < to
                && t.CategoryId != null);

        if (accountId.HasValue)
            query = query.Where(t => t.AccountId == accountId.Value);

        var data = await query
            .GroupBy(t => t.CategoryId)
            .Select(g => new { categoryId = g.Key, total = g.Sum(t => t.Amount) })
            .ToListAsync();

        return Ok(data);
    }
}
