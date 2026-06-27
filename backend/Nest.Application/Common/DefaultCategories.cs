using Nest.Domain.Entities;
using Nest.Domain.Enums;

namespace Nest.Application.Common;

public static class DefaultCategories
{
    public static IReadOnlyList<Category> CreateFor(Guid workspaceId) =>
    [
        // Income
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Salary",             Type = CategoryType.Income,  Icon = "payments",         Color = "#34D399" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Freelance",           Type = CategoryType.Income,  Icon = "computer",         Color = "#2DD4BF" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Business",            Type = CategoryType.Income,  Icon = "business_center",  Color = "#6366F1" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Investment Returns",  Type = CategoryType.Income,  Icon = "trending_up",      Color = "#FBBF24" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Rental Income",       Type = CategoryType.Income,  Icon = "home",             Color = "#818CF8" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Other Income",        Type = CategoryType.Income,  Icon = "add_circle",       Color = "#98A2B3" },

        // Expense
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Groceries",           Type = CategoryType.Expense, Icon = "shopping_cart",    Color = "#2DD4BF" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Dining Out",          Type = CategoryType.Expense, Icon = "restaurant",       Color = "#FB7185" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Transport",           Type = CategoryType.Expense, Icon = "directions_car",   Color = "#FBBF24" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Housing",             Type = CategoryType.Expense, Icon = "home",             Color = "#818CF8" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Healthcare",          Type = CategoryType.Expense, Icon = "local_hospital",   Color = "#34D399" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Entertainment",       Type = CategoryType.Expense, Icon = "movie",            Color = "#A78BFA" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Shopping",            Type = CategoryType.Expense, Icon = "shopping_bag",     Color = "#38BDF8" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Education",           Type = CategoryType.Expense, Icon = "school",           Color = "#6366F1" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Travel",              Type = CategoryType.Expense, Icon = "flight",           Color = "#2DD4BF" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Personal Care",       Type = CategoryType.Expense, Icon = "spa",              Color = "#FB7185" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Subscriptions",       Type = CategoryType.Expense, Icon = "subscriptions",    Color = "#818CF8" },
        new() { Id = Guid.NewGuid(), WorkspaceId = workspaceId, Name = "Other",               Type = CategoryType.Expense, Icon = "category",         Color = "#98A2B3" },
    ];
}
