using Nest.Domain.Enums;

namespace Nest.Application.Workspaces;

public record CreateWorkspaceRequest(string Name);
public record UpdateWorkspaceRequest(string Name);
public record InviteMemberRequest(string Email, WorkspaceMemberRole Role);

public record WorkspaceDto(
    Guid Id,
    string Name,
    Guid OwnerId,
    DateTime CreatedAt,
    IReadOnlyList<WorkspaceMemberDto> Members);

public record WorkspaceMemberDto(
    Guid UserId,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    WorkspaceMemberRole Role,
    DateTime JoinedAt);
