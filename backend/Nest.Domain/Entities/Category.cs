using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Category : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "category";
    public string Color { get; set; } = "#6366F1";
    public CategoryType Type { get; set; }

    public Guid? ParentId { get; set; }
    public Category? Parent { get; set; }
    public ICollection<Category> Children { get; set; } = [];

    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
}
