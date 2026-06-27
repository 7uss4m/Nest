using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/categories")]
[Authorize]
public class CategoriesController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var categories = await db.Categories
            .Where(c => c.WorkspaceId == workspaceId)
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Type, c.Icon, c.Color, c.ParentId })
            .ToListAsync();

        return Ok(categories);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateCategoryDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        if (dto.ParentId.HasValue)
        {
            var parentExists = await db.Categories.AnyAsync(c => c.Id == dto.ParentId && c.WorkspaceId == workspaceId);
            if (!parentExists) return BadRequest("Parent category not found.");
        }

        var category = new Category
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            Name = dto.Name,
            Type = dto.Type,
            Icon = dto.Icon ?? "category",
            Color = dto.Color ?? "#6366F1",
            ParentId = dto.ParentId,
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(CancellationToken.None);
        return CreatedAtAction(nameof(List), new { workspaceId }, new { category.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, UpdateCategoryDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var category = await db.Categories.FirstOrDefaultAsync(c => c.WorkspaceId == workspaceId && c.Id == id);
        if (category is null) return NotFound();

        category.Name = dto.Name;
        category.Icon = dto.Icon ?? category.Icon;
        category.Color = dto.Color ?? category.Color;

        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var category = await db.Categories.FirstOrDefaultAsync(c => c.WorkspaceId == workspaceId && c.Id == id);
        if (category is null) return NotFound();

        var hasTransactions = await db.Transactions.AnyAsync(t => t.CategoryId == id);
        if (hasTransactions) return Conflict("Cannot delete category with linked transactions.");

        db.Categories.Remove(category);
        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }
}

public record CreateCategoryDto(
    string Name,
    CategoryType Type,
    string? Icon,
    string? Color,
    Guid? ParentId);

public record UpdateCategoryDto(
    string Name,
    string? Icon,
    string? Color);
