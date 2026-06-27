using Microsoft.EntityFrameworkCore;
using Nest.Domain.Entities;

namespace Nest.Application.Common;

public interface INestDbContext
{
    DbSet<Workspace> Workspaces { get; }
    DbSet<WorkspaceMember> WorkspaceMembers { get; }
    DbSet<Account> Accounts { get; }
    DbSet<Category> Categories { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<RecurringRule> RecurringRules { get; }
    DbSet<Budget> Budgets { get; }
    DbSet<BudgetPeriodEntry> BudgetPeriodEntries { get; }
    DbSet<PlannedPayment> PlannedPayments { get; }
    DbSet<Attachment> Attachments { get; }
    DbSet<Asset> Assets { get; }
    DbSet<AssetValueHistory> AssetValueHistory { get; }
    DbSet<AssetAttachment> AssetAttachments { get; }
    DbSet<Liability> Liabilities { get; }
    DbSet<LiabilityBalanceHistory> LiabilityBalanceHistory { get; }
    DbSet<ExchangeRate> ExchangeRates { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<TransactionTemplate> TransactionTemplates { get; }
    DbSet<ActivityLog> ActivityLogs { get; }
    DbSet<WorkspaceInvite> WorkspaceInvites { get; }
    DbSet<ApiKey> ApiKeys { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
