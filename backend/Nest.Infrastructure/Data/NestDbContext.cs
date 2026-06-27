using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Nest.Application.Common;
using Nest.Domain.Entities;

namespace Nest.Infrastructure.Data;

public class NestDbContext(DbContextOptions<NestDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options), INestDbContext
{
    public DbSet<Workspace> Workspaces => Set<Workspace>();
    public DbSet<WorkspaceMember> WorkspaceMembers => Set<WorkspaceMember>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<RecurringRule> RecurringRules => Set<RecurringRule>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<BudgetPeriodEntry> BudgetPeriodEntries => Set<BudgetPeriodEntry>();
    public DbSet<PlannedPayment> PlannedPayments => Set<PlannedPayment>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetValueHistory> AssetValueHistory => Set<AssetValueHistory>();
    public DbSet<AssetAttachment> AssetAttachments => Set<AssetAttachment>();
    public DbSet<Liability> Liabilities => Set<Liability>();
    public DbSet<LiabilityBalanceHistory> LiabilityBalanceHistory => Set<LiabilityBalanceHistory>();
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<TransactionTemplate> TransactionTemplates => Set<TransactionTemplate>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<WorkspaceInvite> WorkspaceInvites => Set<WorkspaceInvite>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(NestDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        return base.SaveChangesAsync(ct);
    }
}
