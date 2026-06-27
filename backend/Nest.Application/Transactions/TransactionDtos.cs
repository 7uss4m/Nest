using Nest.Domain.Enums;

namespace Nest.Application.Transactions;

public record CreateTransactionRequest(
    Guid AccountId,
    Guid? CategoryId,
    decimal Amount,
    TransactionType Type,
    DateOnly Date,
    string? Note,
    string? Payee,
    bool IsRecurring,
    Guid? TransferToAccountId,
    RecurrenceRequest? Recurrence);

public record RecurrenceRequest(RecurrenceFrequency Frequency, DateTime? EndDate);

public record UpdateTransactionRequest(
    Guid? CategoryId,
    decimal? Amount,
    DateOnly? Date,
    string? Note,
    string? Payee);

public record TransactionDto(
    Guid Id,
    Guid AccountId,
    string AccountName,
    Guid? CategoryId,
    string? CategoryName,
    string? CategoryIcon,
    string? CategoryColor,
    decimal Amount,
    TransactionType Type,
    DateOnly Date,
    string? Note,
    string? Payee,
    bool IsRecurring,
    DateTime CreatedAt);

public record TransactionListRequest(
    Guid WorkspaceId,
    Guid? AccountId,
    Guid? CategoryId,
    DateOnly? From,
    DateOnly? To,
    TransactionType? Type,
    string? Search,
    int Page = 1,
    int PageSize = 50);

public record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize);
