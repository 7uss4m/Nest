using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;
using Nest.Domain.Enums;
using Nest.Domain.ValueObjects;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/currencies")]
[Authorize]
public class WorkspaceCurrenciesController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CurrencyDto>>> List(Guid workspaceId)
    {
        if (!await IsMemberAsync(workspaceId)) return Forbid();

        var currencies = await db.WorkspaceCurrencies
            .Where(c => c.WorkspaceId == workspaceId)
            .OrderByDescending(c => c.IsDefault)
            .ThenBy(c => c.Code)
            .Select(c => new CurrencyDto(c.Code, c.Symbol, c.DecimalPlaces, c.IsDefault))
            .ToListAsync();

        return Ok(currencies);
    }

    [HttpPost]
    public async Task<ActionResult<CurrencyDto>> Add(Guid workspaceId, AddCurrencyRequest req)
    {
        if (!await IsOwnerAsync(workspaceId)) return Forbid();

        var code = req.Code.Trim().ToUpperInvariant();
        var exists = await db.WorkspaceCurrencies.AnyAsync(c => c.WorkspaceId == workspaceId && c.Code == code);
        if (exists) return Conflict($"Currency {code} already exists in this workspace.");

        if (req.IsDefault)
            await ClearDefaultAsync(workspaceId);

        var currency = new WorkspaceCurrency
        {
            WorkspaceId = workspaceId,
            Code = code,
            Symbol = req.Symbol.Trim(),
            DecimalPlaces = req.DecimalPlaces,
            IsDefault = req.IsDefault,
        };
        db.WorkspaceCurrencies.Add(currency);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(List), new { workspaceId }, new CurrencyDto(currency.Code, currency.Symbol, currency.DecimalPlaces, currency.IsDefault));
    }

    [HttpPut("{code}")]
    public async Task<ActionResult<CurrencyDto>> Update(Guid workspaceId, string code, UpsertCurrencyRequest req)
    {
        if (!await IsOwnerAsync(workspaceId)) return Forbid();

        var currency = await db.WorkspaceCurrencies
            .FirstOrDefaultAsync(c => c.WorkspaceId == workspaceId && c.Code == code.ToUpperInvariant());
        if (currency is null) return NotFound();

        if (req.IsDefault && !currency.IsDefault)
            await ClearDefaultAsync(workspaceId);

        currency.Symbol = req.Symbol.Trim();
        currency.DecimalPlaces = req.DecimalPlaces;
        currency.IsDefault = req.IsDefault;

        await db.SaveChangesAsync();
        return Ok(new CurrencyDto(currency.Code, currency.Symbol, currency.DecimalPlaces, currency.IsDefault));
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> Delete(Guid workspaceId, string code)
    {
        if (!await IsOwnerAsync(workspaceId)) return Forbid();

        var currency = await db.WorkspaceCurrencies
            .FirstOrDefaultAsync(c => c.WorkspaceId == workspaceId && c.Code == code.ToUpperInvariant());
        if (currency is null) return NotFound();

        var count = await db.WorkspaceCurrencies.CountAsync(c => c.WorkspaceId == workspaceId);
        if (count <= 1) return BadRequest("Cannot remove the last currency.");
        if (currency.IsDefault) return BadRequest("Cannot remove the default currency. Set another as default first.");

        db.WorkspaceCurrencies.Remove(currency);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<bool> IsMemberAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    private async Task<bool> IsOwnerAsync(Guid workspaceId)
    {
        var m = await db.WorkspaceMembers.FirstOrDefaultAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);
        return m?.Role == WorkspaceMemberRole.Owner;
    }

    private async Task ClearDefaultAsync(Guid workspaceId)
    {
        var current = await db.WorkspaceCurrencies
            .FirstOrDefaultAsync(c => c.WorkspaceId == workspaceId && c.IsDefault);
        if (current is not null)
            current.IsDefault = false;
    }
}
