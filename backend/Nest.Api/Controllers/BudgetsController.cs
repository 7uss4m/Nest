using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Api.Helpers;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/budgets")]
[Authorize]
public class BudgetsController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var defaultCode = await CurrencyHelper.LoadDefaultCodeAsync(db, workspaceId);

        var budgets = await db.Budgets
            .Where(b => b.WorkspaceId == workspaceId)
            .Select(b => new { b.Id, b.Period, b.AmountLimit, b.Rollover, b.CategoryId, b.CreatedAt })
            .ToListAsync();

        return Ok(budgets.Select(b => new
        {
            b.Id, b.Period, b.Rollover, b.CategoryId, b.CreatedAt,
            AmountLimit = CurrencyHelper.ToMoney(b.AmountLimit, defaultCode),
        }));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateBudgetDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var categoryExists = await db.Categories.AnyAsync(c => c.Id == dto.CategoryId && c.WorkspaceId == workspaceId);
        if (!categoryExists) return BadRequest("Category not found in this workspace.");

        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            CategoryId = dto.CategoryId,
            Period = dto.Period,
            AmountLimit = dto.AmountLimit,
            Rollover = dto.Rollover,
        };

        db.Budgets.Add(budget);
        await db.SaveChangesAsync(CancellationToken.None);
        return CreatedAtAction(nameof(List), new { workspaceId }, new { budget.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, UpdateBudgetDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.WorkspaceId == workspaceId && b.Id == id);
        if (budget is null) return NotFound();

        budget.AmountLimit = dto.AmountLimit;
        budget.Rollover = dto.Rollover;

        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var budget = await db.Budgets.FirstOrDefaultAsync(b => b.WorkspaceId == workspaceId && b.Id == id);
        if (budget is null) return NotFound();

        db.Budgets.Remove(budget);
        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }
}

public record CreateBudgetDto(
    Guid CategoryId,
    BudgetPeriod Period,
    decimal AmountLimit,
    bool Rollover);

public record UpdateBudgetDto(
    decimal AmountLimit,
    bool Rollover);
