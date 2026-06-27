using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Transaction : BaseEntity
{
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public Guid CreatedByUserId { get; set; }

    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
    public string? Payee { get; set; }
    public bool IsRecurring { get; set; }

    public Guid? TransferToAccountId { get; set; }
    public Account? TransferToAccount { get; set; }

    public RecurringRule? RecurringRule { get; set; }
    public ICollection<Attachment> Attachments { get; set; } = [];
}
