using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class Attachment : BaseEntity
{
    public Guid TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;

    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string? Label { get; set; }
}
