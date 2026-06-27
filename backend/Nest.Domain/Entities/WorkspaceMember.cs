using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class WorkspaceMember
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid UserId { get; set; }

    public WorkspaceMemberRole Role { get; set; }
    public DateTime JoinedAt { get; init; } = DateTime.UtcNow;
}
