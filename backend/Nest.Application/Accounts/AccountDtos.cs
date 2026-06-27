using Nest.Application.Currencies;
using Nest.Domain.Enums;

namespace Nest.Application.Accounts;

public record CreateAccountRequest(
    string Name,
    AccountType Type,
    string Currency,
    string Color,
    string Icon,
    bool IsShared);

public record UpdateAccountRequest(
    string? Name,
    string? Color,
    string? Icon,
    bool? IsShared);

public record AccountDto(
    Guid Id,
    Guid WorkspaceId,
    string Name,
    AccountType Type,
    string Currency,
    string Color,
    string Icon,
    bool IsShared,
    MoneyDto Balance,
    DateTime CreatedAt);

public record TransferRequest(
    Guid FromAccountId,
    Guid ToAccountId,
    decimal Amount,
    DateOnly Date,
    string? Note);
