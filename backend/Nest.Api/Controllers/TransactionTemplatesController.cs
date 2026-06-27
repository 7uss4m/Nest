using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/transaction-templates")]
[Authorize]
public class TransactionTemplatesController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var templates = await db.TransactionTemplates
            .Where(t => t.WorkspaceId == workspaceId)
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Id, t.Name, t.Type, t.Amount,
                t.AccountId, t.CategoryId, t.Payee, t.Note,
            })
            .ToListAsync();

        return Ok(templates);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateTemplateDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var template = new TransactionTemplate
        {
            WorkspaceId = workspaceId,
            Name = dto.Name,
            Type = dto.Type,
            Amount = dto.Amount,
            AccountId = dto.AccountId,
            CategoryId = dto.CategoryId,
            Payee = dto.Payee,
            Note = dto.Note,
        };

        db.TransactionTemplates.Add(template);
        await db.SaveChangesAsync();
        return Ok(new { template.Id, template.Name });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, CreateTemplateDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var template = await db.TransactionTemplates
            .FirstOrDefaultAsync(t => t.WorkspaceId == workspaceId && t.Id == id);
        if (template is null) return NotFound();

        template.Name = dto.Name;
        template.Type = dto.Type;
        template.Amount = dto.Amount;
        template.AccountId = dto.AccountId;
        template.CategoryId = dto.CategoryId;
        template.Payee = dto.Payee;
        template.Note = dto.Note;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var template = await db.TransactionTemplates
            .FirstOrDefaultAsync(t => t.WorkspaceId == workspaceId && t.Id == id);
        if (template is null) return NotFound();

        db.TransactionTemplates.Remove(template);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateTemplateDto(
    string Name,
    TransactionType Type,
    decimal? Amount,
    Guid? AccountId,
    Guid? CategoryId,
    string? Payee,
    string? Note);
