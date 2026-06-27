using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Nest.Application.Auth;
using Nest.Infrastructure.Data;

namespace Nest.Api.Extensions;

public class ApiKeyAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IServiceProvider sp)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiKey";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string? raw = null;

        if (Request.Headers.TryGetValue("X-Api-Key", out var h))
            raw = h.FirstOrDefault();
        else if (Request.Headers.TryGetValue("Authorization", out var auth))
        {
            var val = auth.FirstOrDefault() ?? "";
            if (val.StartsWith("ApiKey ", StringComparison.OrdinalIgnoreCase))
                raw = val["ApiKey ".Length..];
        }
        else if (Request.Query.TryGetValue("key", out var q))
            raw = q.FirstOrDefault();

        if (string.IsNullOrEmpty(raw))
            return AuthenticateResult.NoResult();

        await using var scope = sp.CreateAsyncScope();
        var apiKeySvc = scope.ServiceProvider.GetRequiredService<IApiKeyService>();
        var userId = await apiKeySvc.ValidateAsync(raw);
        if (userId is null)
            return AuthenticateResult.Fail("Invalid or expired API key.");

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await userManager.FindByIdAsync(userId.Value.ToString());
        if (user is null)
            return AuthenticateResult.Fail("User not found.");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Name, user.DisplayName),
        };
        var identity  = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        return AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName));
    }
}
