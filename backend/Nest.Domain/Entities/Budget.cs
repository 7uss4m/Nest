using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Budget : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public decimal AmountLimit { get; set; }
    public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
    public bool Rollover { get; set; }

    public ICollection<BudgetPeriodEntry> PeriodEntries { get; set; } = [];
}

public class BudgetPeriodEntry : BaseEntity
{
    public Guid BudgetId { get; set; }
    public Budget Budget { get; set; } = null!;

    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public decimal SpentAmount { get; set; }
}
