namespace Nest.Domain.Entities;

public class WorkspaceCurrency
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public string Code { get; set; } = string.Empty;        // ISO 4217, e.g. "USD"
    public string Symbol { get; set; } = string.Empty;      // e.g. "$"
    public int DecimalPlaces { get; set; } = 2;
    public bool IsDefault { get; set; }
}
