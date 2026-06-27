using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nest.Api.Helpers;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/planned-payments")]
[Authorize]
public class PlannedPaymentsController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    [HttpGet]
    public async Task<IActionResult> List(Guid workspaceId, [FromQuery] bool? upcoming)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var query = db.PlannedPayments.Where(p => p.WorkspaceId == workspaceId).AsQueryable();

        if (upcoming == true)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var cutoff = today.AddDays(30);
            query = query.Where(p => p.DueDate >= today && p.DueDate <= cutoff);
        }

        var raw = await query
            .OrderBy(p => p.DueDate)
            .Select(p => new
            {
                p.Id, p.Name, p.Amount, p.Currency, p.DueDate,
                p.CategoryId, p.IsPaid, p.SkippedUntil, p.Note, p.Icon, p.CreatedAt
            })
            .ToListAsync();

        var decimals = await CurrencyHelper.LoadDecimalsAsync(db, workspaceId);
        return Ok(raw.Select(p => new
        {
            p.Id, p.Name, p.DueDate, p.CategoryId, p.IsPaid, p.SkippedUntil, p.Note, p.Icon, p.CreatedAt,
            Amount = CurrencyHelper.ToMoney(p.Amount, p.Currency, decimals),
        }));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreatePlannedPaymentDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var payment = new PlannedPayment
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            Name = dto.Name,
            Amount = dto.Amount,
            Currency = dto.Currency,
            DueDate = dto.DueDate,
            CategoryId = dto.CategoryId,
            CreatedByUserId = UserId,
            Icon = dto.Icon ?? "event_repeat",
        };

        db.PlannedPayments.Add(payment);
        await db.SaveChangesAsync(CancellationToken.None);
        return CreatedAtAction(nameof(List), new { workspaceId }, new { payment.Id });
    }

    [HttpPatch("{id:guid}/mark-paid")]
    public async Task<IActionResult> MarkPaid(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var payment = await db.PlannedPayments.FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId && p.Id == id);
        if (payment is null) return NotFound();

        payment.IsPaid = true;
        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    /// <summary>Defers the payment by the given number of days (default 30). Clears IsPaid.</summary>
    [HttpPatch("{id:guid}/skip")]
    public async Task<IActionResult> Skip(Guid workspaceId, Guid id, [FromQuery] int deferDays = 30)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();
        if (deferDays < 1 || deferDays > 365) return BadRequest("deferDays must be 1–365.");

        var payment = await db.PlannedPayments.FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId && p.Id == id);
        if (payment is null) return NotFound();

        var basis = payment.SkippedUntil ?? payment.DueDate;
        payment.SkippedUntil = basis.AddDays(deferDays);
        payment.IsPaid = false;
        await db.SaveChangesAsync(CancellationToken.None);
        return Ok(new { payment.Id, skippedUntil = payment.SkippedUntil });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var payment = await db.PlannedPayments.FirstOrDefaultAsync(p => p.WorkspaceId == workspaceId && p.Id == id);
        if (payment is null) return NotFound();

        db.PlannedPayments.Remove(payment);
        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }
}

public record CreatePlannedPaymentDto(
    string? Name,
    decimal Amount,
    string Currency,
    DateOnly DueDate,
    Guid? CategoryId,
    string? Icon);
