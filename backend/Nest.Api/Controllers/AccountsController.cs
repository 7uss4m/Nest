using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nest.Api.Helpers;
using Nest.Application.Accounts;
using Nest.Application.Common;
using Nest.Application.Currencies;
using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/workspaces/{workspaceId:guid}/accounts")]
[Authorize]
public class AccountsController(INestDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountDto>>> GetAll(Guid workspaceId)
    {
        if (!await IsMember(workspaceId)) return Forbid();

        var accounts = await db.Accounts
            .Where(a => a.WorkspaceId == workspaceId)
            .ToListAsync();

        var balances = await GetBalances(accounts.Select(a => a.Id).ToList());
        return Ok(accounts.Select(a => ToDto(a, balances.GetValueOrDefault(a.Id))).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create(Guid workspaceId, CreateAccountRequest req)
    {
        if (!await IsMember(workspaceId, WorkspaceMemberRole.Editor)) return Forbid();

        var account = new Account
        {
            WorkspaceId = workspaceId,
            OwnerUserId = CurrentUserId,
            Name = req.Name,
            Type = req.Type,
            Currency = req.Currency,
            Color = req.Color,
            Icon = req.Icon,
            IsShared = req.IsShared,
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { workspaceId }, ToDto(account, 0));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Update(Guid workspaceId, Guid id, UpdateAccountRequest req)
    {
        if (!await IsMember(workspaceId, WorkspaceMemberRole.Editor)) return Forbid();

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id && a.WorkspaceId == workspaceId);
        if (account is null) return NotFound();

        if (req.Name is not null) account.Name = req.Name;
        if (req.Color is not null) account.Color = req.Color;
        if (req.Icon is not null) account.Icon = req.Icon;
        if (req.IsShared.HasValue) account.IsShared = req.IsShared.Value;

        await db.SaveChangesAsync();
        var balances = await GetBalances([id]);
        return Ok(ToDto(account, balances.GetValueOrDefault(id)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid id)
    {
        if (!await IsMember(workspaceId, WorkspaceMemberRole.Owner)) return Forbid();

        var account = await db.Accounts.FirstOrDefaultAsync(a => a.Id == id && a.WorkspaceId == workspaceId);
        if (account is null) return NotFound();

        db.Accounts.Remove(account);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(Guid workspaceId, TransferRequest req)
    {
        if (!await IsMember(workspaceId, WorkspaceMemberRole.Editor)) return Forbid();

        var fromExists = await db.Accounts.AnyAsync(a => a.Id == req.FromAccountId && a.WorkspaceId == workspaceId);
        var toExists = await db.Accounts.AnyAsync(a => a.Id == req.ToAccountId && a.WorkspaceId == workspaceId);
        if (!fromExists || !toExists) return NotFound("One or both accounts not found.");

        db.Transactions.Add(new Transaction
        {
            AccountId = req.FromAccountId,
            Amount = req.Amount,
            Type = TransactionType.Transfer,
            Date = req.Date,
            Note = req.Note,
            TransferToAccountId = req.ToAccountId,
            CreatedByUserId = CurrentUserId,
        });
        db.Transactions.Add(new Transaction
        {
            AccountId = req.ToAccountId,
            Amount = req.Amount,
            Type = TransactionType.Transfer,
            Date = req.Date,
            Note = req.Note,
            TransferToAccountId = req.FromAccountId,
            CreatedByUserId = CurrentUserId,
        });
        await db.SaveChangesAsync();
        return Ok();
    }

    private async Task<Dictionary<Guid, decimal>> GetBalances(List<Guid> accountIds)
    {
        return await db.Transactions
            .Where(t => accountIds.Contains(t.AccountId))
            .GroupBy(t => t.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Balance = g.Sum(t => t.Type == TransactionType.Income ? t.Amount
                    : t.Type == TransactionType.Expense ? -t.Amount : 0m),
            })
            .ToDictionaryAsync(x => x.AccountId, x => x.Balance);
    }

    private async Task<bool> IsMember(Guid workspaceId, WorkspaceMemberRole? minRole = null)
    {
        var m = await db.WorkspaceMembers.FirstOrDefaultAsync(
            m => m.WorkspaceId == workspaceId && m.UserId == CurrentUserId);
        if (m is null) return false;
        return minRole is null || m.Role <= minRole;
    }

    private static AccountDto ToDto(Account a, decimal balance) => new(
        a.Id, a.WorkspaceId, a.Name, a.Type, a.Currency,
        a.Color, a.Icon, a.IsShared,
        CurrencyHelper.ToMoney(balance, a.Currency),
        a.CreatedAt);
}
