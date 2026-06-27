namespace Nest.Application.Notifications;

public interface INtfyService
{
    Task SendAsync(string userId, string title, string message, string? tags = null, CancellationToken ct = default);
}
