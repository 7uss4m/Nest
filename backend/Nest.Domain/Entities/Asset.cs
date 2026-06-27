using Nest.Domain.Common;
using Nest.Domain.Enums;

namespace Nest.Domain.Entities;

public class Asset : BaseEntity
{
    public Guid WorkspaceId { get; set; }
    public Workspace Workspace { get; set; } = null!;

    public Guid OwnerUserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AssetClass AssetClass { get; set; }
    public AssetType AssetType { get; set; }

    public DateOnly? PurchaseDate { get; set; }
    public decimal? PurchasePrice { get; set; }
    public string PurchaseCurrency { get; set; } = "USD";

    public decimal CurrentValue { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime? CurrentValueUpdatedAt { get; set; }

    // Physical only
    public string? Condition { get; set; }
    public string? Location { get; set; }
    public string? SerialNumber { get; set; }
    public int? UsefulLifeYears { get; set; }

    // Financial only
    public string? Institution { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? PricePerUnit { get; set; }

    public bool IsShared { get; set; }
    public string? Notes { get; set; }

    public ICollection<AssetValueHistory> ValueHistory { get; set; } = [];
    public ICollection<AssetAttachment> Attachments { get; set; } = [];
}

public class AssetAttachment : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public string FileUrl { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string? Label { get; set; }
    public Guid UploadedByUserId { get; set; }
}

public class AssetValueHistory : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public decimal Value { get; set; }
    public Guid RecordedByUserId { get; set; }
}
