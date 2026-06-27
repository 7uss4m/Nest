using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class WorkspaceInvite : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public string InvitedEmail { get; set; } = string.Empty;
    public WorkspaceMemberRole Role { get; set; }

    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsAccepted { get; set; }

    public Guid InvitedByUserId { get; set; }
}
