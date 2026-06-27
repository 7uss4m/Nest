using Microsoft.AspNetCore.Identity;

namespace Nest.Infrastructure.Data;

public class AppUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
