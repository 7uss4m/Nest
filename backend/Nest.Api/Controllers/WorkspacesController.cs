using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Application.Workspaces;
using Nest.Domain.Entities;
using Nest.Domain.Enums;
using Nest.Domain.ValueObjects;
using Nest.Infrastructure.Data;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces")]
[Authorize]
public class WorkspacesController(INestDbContext db, UserManager<AppUser> userManager) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkspaceDto>>> GetAll()
    {
        var workspaceIds = await db.WorkspaceMembers
            .Where(m => m.UserId == CurrentUserId)
            .Select(m => m.WorkspaceId)
            .ToListAsync();

        var workspaces = await db.Workspaces
            .Where(w => workspaceIds.Contains(w.Id))
            .Include(w => w.Members)
            .Include(w => w.Currencies)
            .ToListAsync();

        var memberUserIds = workspaces.SelectMany(w => w.Members.Select(m => m.UserId)).Distinct().ToList();
        var users = await userManager.Users
            .Where(u => memberUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        return Ok(workspaces.Select(w => ToDto(w, users)).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkspaceDto>> Get(Guid id)
    {
        var (ws, users) = await GetWorkspaceWithUsers(id);
        if (ws is null) return NotFound();
        return Ok(ToDto(ws, users!));
    }

    [HttpPost]
    public async Task<ActionResult<WorkspaceDto>> Create(CreateWorkspaceRequest req)
    {
        var ws = new Workspace { Name = req.Name, OwnerId = CurrentUserId };
        ws.Members.Add(new WorkspaceMember { UserId = CurrentUserId, Role = WorkspaceMemberRole.Owner });
        ws.Currencies.Add(new WorkspaceCurrency { WorkspaceId = ws.Id, Code = Currency.USD.Code, Symbol = Currency.USD.Symbol, DecimalPlaces = Currency.USD.DecimalPlaces, IsDefault = true });
        ws.Currencies.Add(new WorkspaceCurrency { WorkspaceId = ws.Id, Code = Currency.EUR.Code, Symbol = Currency.EUR.Symbol, DecimalPlaces = Currency.EUR.DecimalPlaces, IsDefault = false });
        ws.Currencies.Add(new WorkspaceCurrency { WorkspaceId = ws.Id, Code = Currency.SYP.Code, Symbol = Currency.SYP.Symbol, DecimalPlaces = Currency.SYP.DecimalPlaces, IsDefault = false });
        db.Workspaces.Add(ws);
        db.Categories.AddRange(DefaultCategories.CreateFor(ws.Id));
        await db.SaveChangesAsync();

        var currentUser = await userManager.FindByIdAsync(CurrentUserId.ToString());
        var users = new Dictionary<Guid, AppUser> { [CurrentUserId] = currentUser! };
        return CreatedAtAction(nameof(Get), new { id = ws.Id }, ToDto(ws, users));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkspaceDto>> Update(Guid id, UpdateWorkspaceRequest req)
    {
        var (ws, users) = await GetWorkspaceWithUsers(id, WorkspaceMemberRole.Owner);
        if (ws is null) return NotFound();
        ws.Name = req.Name;
        await db.SaveChangesAsync();
        return Ok(ToDto(ws, users!));
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> InviteMember(Guid id, InviteMemberRequest req)
    {
        var (ws, _) = await GetWorkspaceWithUsers(id, WorkspaceMemberRole.Owner);
        if (ws is null) return NotFound();

        var invitee = await userManager.FindByEmailAsync(req.Email);
        if (invitee is not null)
        {
            // User already registered — add directly
            if (ws.Members.Any(m => m.UserId == invitee.Id)) return Conflict("User already a member.");
            ws.Members.Add(new WorkspaceMember { UserId = invitee.Id, Role = req.Role });
            await db.SaveChangesAsync();
            return Ok(new { joined = true });
        }

        // User not registered — create a pending invite with a shareable token
        var existing = await db.WorkspaceInvites
            .FirstOrDefaultAsync(i => i.WorkspaceId == id && i.InvitedEmail == req.Email && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow);
        if (existing is not null) return Ok(new { joined = false, token = existing.Token });

        var invite = new WorkspaceInvite
        {
            WorkspaceId = id,
            InvitedEmail = req.Email,
            Role = req.Role,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray()).TrimEnd('=').Replace('+', '-').Replace('/', '_'),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            InvitedByUserId = CurrentUserId,
        };
        db.WorkspaceInvites.Add(invite);
        await db.SaveChangesAsync();
        return Ok(new { joined = false, token = invite.Token });
    }

    [HttpGet("{id:guid}/invites")]
    public async Task<IActionResult> GetInvites(Guid id)
    {
        var (ws, _) = await GetWorkspaceWithUsers(id, WorkspaceMemberRole.Owner);
        if (ws is null) return NotFound();

        var invites = await db.WorkspaceInvites
            .Where(i => i.WorkspaceId == id && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow)
            .Select(i => new { i.Id, i.InvitedEmail, i.Role, i.Token, i.ExpiresAt })
            .ToListAsync();

        return Ok(invites);
    }

    [HttpDelete("{id:guid}/invites/{inviteId:guid}")]
    public async Task<IActionResult> RevokeInvite(Guid id, Guid inviteId)
    {
        var (ws, _) = await GetWorkspaceWithUsers(id, WorkspaceMemberRole.Owner);
        if (ws is null) return NotFound();

        var invite = await db.WorkspaceInvites.FirstOrDefaultAsync(i => i.Id == inviteId && i.WorkspaceId == id);
        if (invite is null) return NotFound();
        db.WorkspaceInvites.Remove(invite);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Anonymous-accessible: look up invite details by token
    [HttpGet("invites/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInviteByToken(string token)
    {
        var invite = await db.WorkspaceInvites
            .Include(i => i.Workspace)
            .FirstOrDefaultAsync(i => i.Token == token && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow);
        if (invite is null) return NotFound();
        return Ok(new { workspaceName = invite.Workspace.Name, invitedEmail = invite.InvitedEmail, role = invite.Role, expiresAt = invite.ExpiresAt });
    }

    [HttpPost("invites/{token}/accept")]
    public async Task<IActionResult> AcceptInvite(string token)
    {
        var invite = await db.WorkspaceInvites
            .Include(i => i.Workspace)
            .ThenInclude(w => w.Members)
            .FirstOrDefaultAsync(i => i.Token == token && !i.IsAccepted && i.ExpiresAt > DateTime.UtcNow);
        if (invite is null) return NotFound("Invite not found or expired.");

        if (invite.Workspace.Members.Any(m => m.UserId == CurrentUserId))
            return Conflict("You are already a member of this workspace.");

        invite.Workspace.Members.Add(new WorkspaceMember { UserId = CurrentUserId, Role = invite.Role });
        invite.IsAccepted = true;
        await db.SaveChangesAsync();

        return Ok(new { workspaceId = invite.WorkspaceId, workspaceName = invite.Workspace.Name });
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        var (ws, _) = await GetWorkspaceWithUsers(id, WorkspaceMemberRole.Owner);
        if (ws is null) return NotFound();

        var member = ws.Members.FirstOrDefault(m => m.UserId == userId);
        if (member is null) return NotFound();
        if (member.Role == WorkspaceMemberRole.Owner) return BadRequest("Cannot remove owner.");

        ws.Members.Remove(member);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<(Workspace? ws, Dictionary<Guid, AppUser>? users)> GetWorkspaceWithUsers(
        Guid id, WorkspaceMemberRole? minRole = null)
    {
        var ws = await db.Workspaces
            .Include(w => w.Members)
            .Include(w => w.Currencies)
            .FirstOrDefaultAsync(w => w.Id == id);
        if (ws is null) return (null, null);

        var myMembership = ws.Members.FirstOrDefault(m => m.UserId == CurrentUserId);
        if (myMembership is null) return (null, null);
        if (minRole is not null && myMembership.Role > minRole) return (null, null);

        var userIds = ws.Members.Select(m => m.UserId).ToList();
        var users = await userManager.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        return (ws, users);
    }

    private static WorkspaceDto ToDto(Workspace ws, Dictionary<Guid, AppUser> users) => new(
        ws.Id, ws.Name, ws.OwnerId, ws.CreatedAt,
        ws.Members.Select(m =>
        {
            users.TryGetValue(m.UserId, out var u);
            return new WorkspaceMemberDto(
                m.UserId, u?.DisplayName ?? "", u?.Email ?? "",
                u?.AvatarUrl, m.Role, m.JoinedAt);
        }).ToList(),
        ws.Currencies
            .OrderByDescending(c => c.IsDefault)
            .ThenBy(c => c.Code)
            .Select(c => new CurrencyDto(c.Code, c.Symbol, c.DecimalPlaces, c.IsDefault))
            .ToList());
}
