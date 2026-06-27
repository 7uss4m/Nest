using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class TransactionTemplate : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid? AccountId { get; set; }
    public Account? Account { get; set; }

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal? Amount { get; set; }
    public string? Payee { get; set; }
    public string? Note { get; set; }
}
