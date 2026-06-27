using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class ExchangeRate : BaseEntity
{
    public string BaseCurrency { get; set; } = string.Empty;
    public string TargetCurrency { get; set; } = string.Empty;
    public decimal Rate { get; set; }
    public Guid RecordedByUserId { get; set; }
}
