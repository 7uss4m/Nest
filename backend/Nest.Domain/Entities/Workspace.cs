using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class Workspace : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid OwnerId { get; set; }

    public ICollection<WorkspaceMember> Members { get; set; } = [];
    public ICollection<WorkspaceCurrency> Currencies { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Category> Categories { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
    public ICollection<PlannedPayment> PlannedPayments { get; set; } = [];
}
