using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Nest.Application.Notifications;

namespace Nest.Infrastructure.Services;

public class NtfyService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<NtfyService> logger) : INtfyService
{
    public async Task SendAsync(string userId, string title, string message, string? tags = null, CancellationToken ct = default)
    {
        var baseUrl = config["Ntfy:BaseUrl"]?.TrimEnd('/');
        var topicTemplate = config["Ntfy:Topic"] ?? "nest-{userId}";
        var token = config["Ntfy:Token"];

        if (string.IsNullOrWhiteSpace(baseUrl)) return;

        var topic = topicTemplate.Replace("{userId}", userId);
        var url = $"{baseUrl}/{topic}";

        var client = httpClientFactory.CreateClient("ntfy");
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(message),
        };

        request.Headers.Add("Title", title);
        if (!string.IsNullOrWhiteSpace(tags))
            request.Headers.Add("Tags", tags);

        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Add("Authorization", $"Bearer {token}");

        try
        {
            var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                logger.LogWarning("ntfy returned {Status} for topic {Topic}", response.StatusCode, topic);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send ntfy notification to {Topic}", topic);
        }
    }
}
