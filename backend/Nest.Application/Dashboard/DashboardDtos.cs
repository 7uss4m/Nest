namespace Nest.Application.Dashboard;

public record DashboardQuery(Guid WorkspaceId, int Year, int Month, string DisplayCurrency = "USD");

public record DashboardDto(
    decimal NetWorth,
    decimal Assets,
    decimal Liabilities,
    decimal MonthIncome,
    decimal MonthExpenses,
    decimal MonthSaved,
    decimal IncomeChangePercent,
    decimal ExpensesChangePercent,
    decimal SavingsRate,
    IReadOnlyList<NetWorthPoint> NetWorthTrend,
    IReadOnlyList<BudgetHealthItem> BudgetHealth,
    IReadOnlyList<SpendingCategory> SpendingByCategory,
    IReadOnlyList<UpcomingPaymentDto> UpcomingPayments,
    IReadOnlyList<AccountSummaryDto> Accounts);

public record NetWorthPoint(string Label, decimal Value);

public record BudgetHealthItem(
    Guid BudgetId,
    string CategoryName,
    string CategoryIcon,
    string CategoryColor,
    decimal Limit,
    decimal Spent,
    bool IsOver);

public record SpendingCategory(
    Guid CategoryId,
    string Name,
    string Color,
    decimal Amount,
    decimal Percent);

public record UpcomingPaymentDto(
    Guid Id,
    string Name,
    string Icon,
    DateOnly DueDate,
    bool IsOverdue,
    int DaysUntilDue,
    decimal Amount,
    string Currency);

public record AccountSummaryDto(
    Guid Id,
    string Name,
    string Type,
    string Currency,
    string Icon,
    string Color,
    decimal Balance);
