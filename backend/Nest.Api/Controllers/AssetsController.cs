using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/assets")]
[Authorize]
public class AssetsController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var assets = await db.Assets
            .Where(a => a.WorkspaceId == workspaceId)
            .Select(a => new
            {
                a.Id, a.Name, a.Description, a.AssetClass, a.AssetType,
                a.CurrentValue, a.Currency,
                a.PurchaseDate, a.PurchasePrice, a.PurchaseCurrency,
                a.Institution, a.Condition, a.Location,
                a.IsShared, a.Notes, a.CreatedAt, a.CurrentValueUpdatedAt,
            })
            .ToListAsync();

        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var asset = await db.Assets
            .Where(a => a.WorkspaceId == workspaceId && a.Id == id)
            .Select(a => new
            {
                a.Id, a.Name, a.Description, a.AssetClass, a.AssetType,
                a.CurrentValue, a.Currency,
                a.PurchaseDate, a.PurchasePrice, a.PurchaseCurrency,
                a.Institution, a.Condition, a.Location,
                a.IsShared, a.Notes, a.CreatedAt, a.CurrentValueUpdatedAt,
                ValueHistory = a.ValueHistory
                    .OrderBy(h => h.CreatedAt)
                    .Select(h => new { h.Value, h.CreatedAt })
                    .ToList(),
            })
            .FirstOrDefaultAsync();

        if (asset is null) return NotFound();
        return Ok(asset);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateAssetDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            OwnerUserId = UserId,
            Name = dto.Name,
            Description = dto.Description,
            AssetClass = dto.AssetClass,
            AssetType = dto.AssetType,
            CurrentValue = dto.CurrentValue,
            Currency = dto.Currency,
            PurchaseDate = dto.PurchaseDate,
            PurchasePrice = dto.PurchasePrice,
            PurchaseCurrency = dto.PurchaseCurrency ?? dto.Currency,
            Institution = dto.Institution,
            Condition = dto.Condition,
            Location = dto.Location,
            IsShared = dto.IsShared,
            Notes = dto.Notes,
            CurrentValueUpdatedAt = DateTime.UtcNow,
        };

        // Record initial value in history
        asset.ValueHistory.Add(new AssetValueHistory
        {
            Id = Guid.NewGuid(),
            AssetId = asset.Id,
            Value = dto.CurrentValue,
            RecordedByUserId = UserId,
        });

        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(List), new { workspaceId }, new { asset.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, UpdateAssetDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var asset = await db.Assets.FirstOrDefaultAsync(a => a.WorkspaceId == workspaceId && a.Id == id);
        if (asset is null) return NotFound();

        asset.Name = dto.Name;
        asset.Description = dto.Description;
        asset.Institution = dto.Institution;
        asset.Condition = dto.Condition;
        asset.Location = dto.Location;
        asset.IsShared = dto.IsShared;
        asset.Notes = dto.Notes;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/value")]
    public async Task<IActionResult> RecordValue(Guid workspaceId, Guid id, RecordAssetValueDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var asset = await db.Assets.FirstOrDefaultAsync(a => a.WorkspaceId == workspaceId && a.Id == id);
        if (asset is null) return NotFound();

        asset.CurrentValue = dto.Value;
        asset.CurrentValueUpdatedAt = DateTime.UtcNow;

        db.AssetValueHistory.Add(new AssetValueHistory
        {
            Id = Guid.NewGuid(),
            AssetId = asset.Id,
            Value = dto.Value,
            RecordedByUserId = UserId,
        });

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var asset = await db.Assets.FirstOrDefaultAsync(a => a.WorkspaceId == workspaceId && a.Id == id);
        if (asset is null) return NotFound();

        db.Assets.Remove(asset);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateAssetDto(
    string Name,
    string? Description,
    AssetClass AssetClass,
    AssetType AssetType,
    decimal CurrentValue,
    string Currency,
    DateOnly? PurchaseDate,
    decimal? PurchasePrice,
    string? PurchaseCurrency,
    string? Institution,
    string? Condition,
    string? Location,
    bool IsShared,
    string? Notes);

public record UpdateAssetDto(
    string Name,
    string? Description,
    string? Institution,
    string? Condition,
    string? Location,
    bool IsShared,
    string? Notes);

public record RecordAssetValueDto(decimal Value);
