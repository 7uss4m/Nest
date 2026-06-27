using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Liability : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid OwnerUserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public LiabilityType Type { get; set; }
    public string? LenderName { get; set; }

    public decimal OriginalAmount { get; set; }
    public decimal CurrentBalance { get; set; }
    public string Currency { get; set; } = "USD";

    public decimal? InterestRate { get; set; }
    public decimal? MonthlyPayment { get; set; }

    public DateOnly? StartDate { get; set; }
    public DateOnly? DueDate { get; set; }

    public Guid? LinkedAssetId { get; set; }
    public Asset? LinkedAsset { get; set; }

    public bool IsShared { get; set; }
    public string? Notes { get; set; }

    public ICollection<LiabilityBalanceHistory> BalanceHistory { get; set; } = [];
}

public class LiabilityBalanceHistory : BaseEntity
{
    public Guid LiabilityId { get; set; }
    public Liability Liability { get; set; } = null!;

    public decimal Balance { get; set; }
    public Guid RecordedByUserId { get; set; }
}
