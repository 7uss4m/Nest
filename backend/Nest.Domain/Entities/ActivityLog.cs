using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;

    /// <summary>e.g. "transaction.created", "transaction.deleted", "budget.created"</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Human-readable description, e.g. "Added expense of $45.00 at Whole Foods"</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Optional reference to the affected entity.</summary>
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
}
