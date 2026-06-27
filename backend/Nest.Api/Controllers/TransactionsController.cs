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
[Route("api/workspaces/{workspaceId:guid}/transactions")]
[Authorize]
public class TransactionsController(INestDbContext db) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string UserDisplayName => User.FindFirstValue("displayName") ?? User.FindFirstValue(ClaimTypes.Email) ?? "Unknown";

    private async Task<bool> HasAccessAsync(Guid workspaceId) =>
        await db.WorkspaceMembers.AnyAsync(m => m.WorkspaceId == workspaceId && m.UserId == UserId);

    private void LogActivity(Guid workspaceId, string action, string description, Guid? entityId = null, string? entityType = null)
    {
        db.ActivityLogs.Add(new ActivityLog
        {
            WorkspaceId = workspaceId,
            UserId = UserId,
            UserName = UserDisplayName,
            Action = action,
            Description = description,
            EntityId = entityId,
            EntityType = entityType,
        });
    }

    [HttpGet]
    public async Task<IActionResult> List(
        Guid workspaceId,
        [FromQuery] Guid? accountId,
        [FromQuery] Guid? categoryId,
        [FromQuery] TransactionType? type,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var query = db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId)
            .AsQueryable();

        if (accountId.HasValue) query = query.Where(t => t.AccountId == accountId);
        if (categoryId.HasValue) query = query.Where(t => t.CategoryId == categoryId);
        if (type.HasValue) query = query.Where(t => t.Type == type);
        if (from.HasValue) query = query.Where(t => t.Date >= from);
        if (to.HasValue) query = query.Where(t => t.Date <= to);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(t =>
                (t.Note != null && t.Note.ToLower().Contains(term)) ||
                (t.Payee != null && t.Payee.ToLower().Contains(term)));
        }

        var total = await query.CountAsync();
        var rawItems = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id, t.Type, t.Amount,
                CurrencyCode = t.Account.Currency,
                t.Date, t.Note, t.Payee, t.AccountId, t.CategoryId,
                t.IsRecurring, t.CreatedAt
            })
            .ToListAsync();

        var decimals = await CurrencyHelper.LoadDecimalsAsync(db, workspaceId);
        var items = rawItems.Select(t => new
        {
            t.Id, t.Type,
            Amount = CurrencyHelper.ToMoney(t.Amount, t.CurrencyCode, decimals),
            t.Date, t.Note, t.Payee, t.AccountId, t.CategoryId,
            t.IsRecurring, t.CreatedAt,
        }).ToList();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var raw = await db.Transactions
            .Where(t => t.Account.WorkspaceId == workspaceId && t.Id == id)
            .Select(t => new
            {
                t.Id, t.Type, t.Amount,
                CurrencyCode = t.Account.Currency,
                t.Date, t.Note, t.Payee,
                t.AccountId, t.CategoryId, t.IsRecurring, t.CreatedAt, t.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (raw is null) return NotFound();
        var decimals = await CurrencyHelper.LoadDecimalsAsync(db, workspaceId);
        return Ok(new
        {
            raw.Id, raw.Type,
            Amount = CurrencyHelper.ToMoney(raw.Amount, raw.CurrencyCode, decimals),
            raw.Date, raw.Note, raw.Payee,
            raw.AccountId, raw.CategoryId, raw.IsRecurring, raw.CreatedAt, raw.UpdatedAt,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid workspaceId, CreateTransactionDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var accountExists = await db.Accounts.AnyAsync(a => a.Id == dto.AccountId && a.WorkspaceId == workspaceId);
        if (!accountExists) return BadRequest("Account not found in this workspace.");

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            AccountId = dto.AccountId,
            CategoryId = dto.CategoryId,
            CreatedByUserId = UserId,
            Type = dto.Type,
            Amount = dto.Amount,
            Date = dto.Date,
            Note = dto.Note,
            Payee = dto.Payee,
        };

        db.Transactions.Add(transaction);

        var typeLabel = dto.Type == TransactionType.Income ? "income" : dto.Type == TransactionType.Expense ? "expense" : "transfer";
        var desc = dto.Payee is not null
            ? $"Added {typeLabel} of {dto.Amount:F2} at {dto.Payee}"
            : $"Added {typeLabel} of {dto.Amount:F2}";
        LogActivity(workspaceId, "transaction.created", desc, transaction.Id, "Transaction");

        await db.SaveChangesAsync(CancellationToken.None);
        return CreatedAtAction(nameof(Get), new { workspaceId, id = transaction.Id }, transaction);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid workspaceId, Guid id, UpdateTransactionDto dto)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var transaction = await db.Transactions
            .FirstOrDefaultAsync(t => t.Account.WorkspaceId == workspaceId && t.Id == id);
        if (transaction is null) return NotFound();

        transaction.CategoryId = dto.CategoryId;
        transaction.Amount = dto.Amount;
        transaction.Date = dto.Date;
        transaction.Note = dto.Note;
        transaction.Payee = dto.Payee;

        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await HasAccessAsync(workspaceId)) return Forbid();

        var transaction = await db.Transactions
            .FirstOrDefaultAsync(t => t.Account.WorkspaceId == workspaceId && t.Id == id);
        if (transaction is null) return NotFound();

        var typeLabel = transaction.Type == TransactionType.Income ? "income" : transaction.Type == TransactionType.Expense ? "expense" : "transfer";
        var desc = transaction.Payee is not null
            ? $"Deleted {typeLabel} of {transaction.Amount:F2} at {transaction.Payee}"
            : $"Deleted {typeLabel} of {transaction.Amount:F2}";
        LogActivity(workspaceId, "transaction.deleted", desc, transaction.Id, "Transaction");

        db.Transactions.Remove(transaction);
        await db.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }
}

public record CreateTransactionDto(
    Guid AccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly Date,
    string? Note,
    string? Payee);

public record UpdateTransactionDto(
    Guid? CategoryId,
    decimal Amount,
    DateOnly Date,
    string? Note,
    string? Payee);
