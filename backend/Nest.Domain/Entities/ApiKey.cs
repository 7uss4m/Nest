using Nest.Domain.Common;

namespace Nest.Domain.Entities;

public class ApiKey : BaseEntity
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string KeyHash { get; set; } = "";   // SHA-256 of raw key, hex-encoded
    public string Prefix { get; set; } = "";    // first 12 chars of raw key for display
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
}
