using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/liabilities")]
[Authorize]
public class LiabilitiesController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liabilities = await db.Liabilities
            .Where(l => l.WorkspaceId == workspaceId)
            .Select(l => new
            {
                l.Id, l.Name, l.Type, l.LenderName,
                l.OriginalAmount, l.CurrentBalance, l.Currency,
                l.InterestRate, l.MonthlyPayment,
                l.StartDate, l.DueDate,
                l.LinkedAssetId,
                l.IsShared, l.Notes, l.CreatedAt,
            })
            .ToListAsync();

        return Ok(liabilities);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liability = await db.Liabilities
            .Where(l => l.WorkspaceId == workspaceId && l.Id == id)
            .Select(l => new
            {
                l.Id, l.Name, l.Type, l.LenderName,
                l.OriginalAmount, l.CurrentBalance, l.Currency,
                l.InterestRate, l.MonthlyPayment,
                l.StartDate, l.DueDate,
                l.LinkedAssetId,
                l.IsShared, l.Notes, l.CreatedAt,
                BalanceHistory = l.BalanceHistory
                    .OrderBy(h => h.CreatedAt)
                    .Select(h => new { h.Balance, h.CreatedAt })
                    .ToList(),
            })
            .FirstOrDefaultAsync();

        if (liability is null) return NotFound();
        return Ok(liability);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateLiabilityDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liability = new Liability
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            OwnerUserId = UserId,
            Name = dto.Name,
            Type = dto.Type,
            LenderName = dto.LenderName,
            OriginalAmount = dto.OriginalAmount,
            CurrentBalance = dto.CurrentBalance,
            Currency = dto.Currency,
            InterestRate = dto.InterestRate,
            MonthlyPayment = dto.MonthlyPayment,
            StartDate = dto.StartDate,
            DueDate = dto.DueDate,
            IsShared = dto.IsShared,
            Notes = dto.Notes,
            LinkedAssetId = dto.LinkedAssetId,
        };

        // Record initial balance in history
        liability.BalanceHistory.Add(new LiabilityBalanceHistory
        {
            Id = Guid.NewGuid(),
            LiabilityId = liability.Id,
            Balance = dto.CurrentBalance,
            RecordedByUserId = UserId,
        });

        db.Liabilities.Add(liability);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { workspaceId }, new { liability.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, UpdateLiabilityDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liability = await db.Liabilities.FirstOrDefaultAsync(l => l.WorkspaceId == workspaceId && l.Id == id);
        if (liability is null) return NotFound();

        liability.Name = dto.Name;
        liability.LenderName = dto.LenderName;
        liability.InterestRate = dto.InterestRate;
        liability.MonthlyPayment = dto.MonthlyPayment;
        liability.DueDate = dto.DueDate;
        liability.IsShared = dto.IsShared;
        liability.Notes = dto.Notes;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/balance")]
    public async Task<IActionResult> RecordBalance(Guid workspaceId, Guid id, RecordBalanceDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liability = await db.Liabilities.FirstOrDefaultAsync(l => l.WorkspaceId == workspaceId && l.Id == id);
        if (liability is null) return NotFound();

        liability.CurrentBalance = dto.Balance;

        db.LiabilityBalanceHistory.Add(new LiabilityBalanceHistory
        {
            Id = Guid.NewGuid(),
            LiabilityId = liability.Id,
            Balance = dto.Balance,
            RecordedByUserId = UserId,
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var liability = await db.Liabilities.FirstOrDefaultAsync(l => l.WorkspaceId == workspaceId && l.Id == id);
        if (liability is null) return NotFound();

        db.Liabilities.Remove(liability);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateLiabilityDto(
    string Name,
    LiabilityType Type,
    string? LenderName,
    decimal OriginalAmount,
    decimal CurrentBalance,
    string Currency,
    decimal? InterestRate,
    decimal? MonthlyPayment,
    DateOnly? StartDate,
    DateOnly? DueDate,
    bool IsShared,
    string? Notes,
    Guid? LinkedAssetId);

public record UpdateLiabilityDto(
    string Name,
    string? LenderName,
    decimal? InterestRate,
    decimal? MonthlyPayment,
    DateOnly? DueDate,
    bool IsShared,
    string? Notes);

public record RecordBalanceDto(decimal Balance);
