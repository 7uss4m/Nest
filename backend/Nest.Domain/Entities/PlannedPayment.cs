using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class PlannedPayment : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }

    public Guid CreatedByUserId { get; set; }

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DateOnly DueDate { get; set; }
    public bool IsPaid { get; set; }
    /// <summary>When set, the payment is deferred — treat as not due until this date.</summary>
    public DateOnly? SkippedUntil { get; set; }
    public string? Note { get; set; }
    public string? Name { get; set; }
    public string Icon { get; set; } = "event_repeat";
}
