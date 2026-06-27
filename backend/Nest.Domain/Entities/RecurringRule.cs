using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class RecurringRule : BaseEntity
{
    public Guid TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;

    public RecurrenceFrequency Frequency { get; set; }
    public DateTime NextOccurrence { get; set; }
    public DateTime? EndDate { get; set; }
}
