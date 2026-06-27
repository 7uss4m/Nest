using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Account : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid OwnerUserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public string Currency { get; set; } = "USD";
    public string Color { get; set; } = "#6366F1";
    public string Icon { get; set; } = "account_balance_wallet";
    public bool IsShared { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = [];
}
