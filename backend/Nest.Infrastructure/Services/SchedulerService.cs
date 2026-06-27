using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nest.Application.Common;
using Nest.Application.Notifications;
using Nest.Domain.Entities;
using Nest.Domain.Enums;
using Nest.Infrastructure.Data;

namespace Nest.Infrastructure.Services;

/// <summary>
/// Runs every hour. Three jobs:
///   1. Spawn transactions for due recurring rules (catches up on all missed dates if service was down).
///   2. Send ntfy + email reminders for planned payments due today or tomorrow.
///   3. Send ntfy + email over-budget alerts when current-month spending exceeds a budget limit.
/// </summary>
public sealed class SchedulerService(
    IServiceScopeFactory scopeFactory,
    ILogger<SchedulerService> logger) : BackgroundService
{
    // Tracks budgets already alerted this calendar month to avoid hourly spam.
    // Key: "{budgetId}:{year}-{month}:{threshold}" — threshold is "warn" (90%) or "over" (100%).
    private readonly HashSet<string> _alertedBudgets = [];

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Short startup delay so the API is fully ready before the first tick.
        await Task.Delay(TimeSpan.FromSeconds(15), ct);

        while (!ct.IsCancellationRequested)
        {
            try
            {
                await TickAsync(ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Scheduler tick failed");
            }

            await Task.Delay(TimeSpan.FromHours(1), ct);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db          = scope.ServiceProvider.GetRequiredService<INestDbContext>();
        var ntfy        = scope.ServiceProvider.GetRequiredService<INtfyService>();
        var email       = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        var created  = await ProcessRecurringRulesAsync(db, ct);
        var notified = await ProcessPaymentNotificationsAsync(db, ntfy, email, userManager, ct);
        var alerted  = await ProcessOverBudgetAlertsAsync(db, ntfy, email, userManager, ct);

        if (created > 0 || notified > 0 || alerted > 0)
            logger.LogInformation(
                "Scheduler: created {Tx} recurring tx, sent {N} payment notification(s), {A} over-budget alert(s)",
                created, notified, alerted);
    }

    // ── Recurring transactions ────────────────────────────────────────────────

    private static async Task<int> ProcessRecurringRulesAsync(INestDbContext db, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rules = await db.RecurringRules
            .Include(r => r.Transaction)
            .Where(r => DateOnly.FromDateTime(r.NextOccurrence) <= today)
            .ToListAsync(ct);

        if (rules.Count == 0) return 0;

        int created = 0;
        var rulesToRemove = new List<RecurringRule>();

        foreach (var rule in rules)
        {
            var template = rule.Transaction;
            var next = rule.NextOccurrence;

            // Catch up on all missed occurrences (handles downtime gracefully).
            while (DateOnly.FromDateTime(next) <= today)
            {
                if (rule.EndDate.HasValue && next > rule.EndDate.Value) break;

                db.Transactions.Add(new Transaction
                {
                    AccountId = template.AccountId,
                    CategoryId = template.CategoryId,
                    CreatedByUserId = template.CreatedByUserId,
                    Amount = template.Amount,
                    Type = template.Type,
                    Date = DateOnly.FromDateTime(next),
                    Note = template.Note,
                    Payee = template.Payee,
                    IsRecurring = true,
                    TransferToAccountId = template.TransferToAccountId,
                });
                created++;

                next = Advance(next, rule.Frequency);
            }

            rule.NextOccurrence = next;

            if (rule.EndDate.HasValue && next > rule.EndDate.Value)
                rulesToRemove.Add(rule);
        }

        foreach (var r in rulesToRemove)
            db.RecurringRules.Remove(r);

        await db.SaveChangesAsync(ct);
        return created;
    }

    private static DateTime Advance(DateTime dt, RecurrenceFrequency freq) => freq switch
    {
        RecurrenceFrequency.Daily => dt.AddDays(1),
        RecurrenceFrequency.Weekly => dt.AddDays(7),
        RecurrenceFrequency.Monthly => dt.AddMonths(1),
        _ => dt.AddMonths(1),
    };

    // ── Payment notifications ─────────────────────────────────────────────────

    private static async Task<int> ProcessPaymentNotificationsAsync(
        INestDbContext db, INtfyService ntfy, IEmailService emailSvc,
        UserManager<AppUser> userManager, CancellationToken ct)
    {
        var today    = DateOnly.FromDateTime(DateTime.UtcNow);
        var tomorrow = today.AddDays(1);

        var duePayments = await db.PlannedPayments
            .Where(p => !p.IsPaid && (p.DueDate == today || p.DueDate == tomorrow))
            .ToListAsync(ct);

        if (duePayments.Count == 0) return 0;

        // Resolve workspace members for all affected workspaces in one query.
        var wsIds = duePayments.Select(p => p.WorkspaceId).Distinct().ToList();
        var membersByWs = await db.WorkspaceMembers
            .Where(m => wsIds.Contains(m.WorkspaceId))
            .GroupBy(m => m.WorkspaceId)
            .ToDictionaryAsync(
                g => g.Key,
                g => g.Select(m => m.UserId).ToList(),
                ct);

        // Fetch user details for email in one query.
        var allUserGuids = membersByWs.Values.SelectMany(ids => ids).Distinct().ToList();
        var users = await userManager.Users
            .Where(u => allUserGuids.Contains(u.Id))
            .ToListAsync(ct);
        var usersById = users.ToDictionary(u => u.Id);

        int sent = 0;
        foreach (var payment in duePayments)
        {
            if (!membersByWs.TryGetValue(payment.WorkspaceId, out var userGuids)) continue;

            var isToday = payment.DueDate == today;
            var ntfyTitle = isToday ? "Payment Due Today" : "Payment Due Tomorrow";
            var ntfyBody  = $"{payment.Name} — {payment.Amount:N2} {payment.Currency}";
            var tags      = isToday ? "money_with_wings,rotating_light" : "money_with_wings,calendar";
            var emailSubject = isToday
                ? $"Payment Due Today: {payment.Name}"
                : $"Upcoming Payment Tomorrow: {payment.Name}";

            foreach (var userGuid in userGuids)
            {
                await ntfy.SendAsync(userGuid.ToString(), ntfyTitle, ntfyBody, tags, ct);

                if (usersById.TryGetValue(userGuid, out var user) && !string.IsNullOrWhiteSpace(user.Email))
                    await emailSvc.SendAsync(user.Email, emailSubject,
                        BuildPaymentEmailBody(user.DisplayName, payment, isToday), ct);

                sent++;
            }
        }

        return sent;
    }

    private static string BuildPaymentEmailBody(string displayName, PlannedPayment payment, bool isToday)
    {
        var when = isToday ? "today" : "tomorrow";
        return $"""
            Hi {displayName},

            Your planned payment is due {when}:

              {payment.Name}
              Amount: {payment.Amount:N2} {payment.Currency}
              Due: {payment.DueDate:MMMM d, yyyy}

            Log in to Nest to mark it as paid or skip it.

            — Nest
            """;
    }

    // ── Over-budget alerts ────────────────────────────────────────────────────

    private async Task<int> ProcessOverBudgetAlertsAsync(
        INestDbContext db, INtfyService ntfy, IEmailService emailSvc,
        UserManager<AppUser> userManager, CancellationToken ct)
    {
        var now         = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = new DateOnly(now.Year, now.Month, 1);
        var periodEnd   = periodStart.AddMonths(1);

        // Monthly budgets: include CategoryId and Category.Name.
        var budgets = await db.Budgets
            .Where(b => b.Period == BudgetPeriod.Monthly && b.AmountLimit > 0)
            .Select(b => new
            {
                b.Id,
                b.WorkspaceId,
                b.CategoryId,
                CategoryName = b.Category.Name,
                b.AmountLimit,
            })
            .ToListAsync(ct);

        if (budgets.Count == 0) return 0;

        // Actual spending this month, grouped by (WorkspaceId, CategoryId).
        var wsIds = budgets.Select(b => b.WorkspaceId).Distinct().ToList();
        var spending = await db.Transactions
            .Where(t => t.Type == TransactionType.Expense
                && t.Date >= periodStart && t.Date < periodEnd
                && t.CategoryId != null
                && wsIds.Contains(t.Account.WorkspaceId))
            .GroupBy(t => new { t.Account.WorkspaceId, CatId = t.CategoryId!.Value })
            .Select(g => new { g.Key.WorkspaceId, g.Key.CatId, Total = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        // Workspace members keyed by workspace id.
        var membersByWs = await db.WorkspaceMembers
            .Where(m => wsIds.Contains(m.WorkspaceId))
            .GroupBy(m => m.WorkspaceId)
            .ToDictionaryAsync(g => g.Key, g => g.Select(m => m.UserId).ToList(), ct);

        // Fetch user details for email in one query.
        var allUserGuids = membersByWs.Values.SelectMany(ids => ids).Distinct().ToList();
        var users = await userManager.Users
            .Where(u => allUserGuids.Contains(u.Id))
            .ToListAsync(ct);
        var usersById = users.ToDictionary(u => u.Id);

        int sent = 0;
        foreach (var budget in budgets)
        {
            if (!membersByWs.TryGetValue(budget.WorkspaceId, out var userGuids)) continue;

            var spent = spending
                .FirstOrDefault(s => s.WorkspaceId == budget.WorkspaceId && s.CatId == budget.CategoryId)
                ?.Total ?? 0m;

            var pct = spent / budget.AmountLimit;
            string threshold;
            string title;
            string ntfyBody;

            if (pct >= 1.0m)
            {
                threshold = "over";
                title     = "Over Budget!";
                ntfyBody  = $"{budget.CategoryName} — spent {spent:N2} of {budget.AmountLimit:N2} limit";
            }
            else if (pct >= 0.9m)
            {
                threshold = "warn";
                title     = "Budget Warning";
                ntfyBody  = $"{budget.CategoryName} — {pct * 100:N0}% of limit used ({spent:N2} / {budget.AmountLimit:N2})";
            }
            else continue;

            // Deduplicate: only alert once per budget per month per threshold level.
            var dedupeKey = $"{budget.Id}:{now.Year}-{now.Month}:{threshold}";
            if (!_alertedBudgets.Add(dedupeKey)) continue;

            foreach (var userGuid in userGuids)
            {
                await ntfy.SendAsync(userGuid.ToString(), title, ntfyBody, "moneybag,warning", ct);

                if (usersById.TryGetValue(userGuid, out var user) && !string.IsNullOrWhiteSpace(user.Email))
                    await emailSvc.SendAsync(user.Email, title,
                        BuildBudgetAlertEmailBody(user.DisplayName, budget.CategoryName, spent, budget.AmountLimit, pct), ct);

                sent++;
            }
        }

        return sent;
    }

    private static string BuildBudgetAlertEmailBody(
        string displayName, string? categoryName, decimal spent, decimal limit, decimal pct)
    {
        return $"""
            Hi {displayName},

            Budget alert for {categoryName}:

              Spent: {spent:N2} of {limit:N2}
              Usage: {pct * 100:N0}%

            Log in to Nest to review your transactions.

            — Nest
            """;
    }
}
