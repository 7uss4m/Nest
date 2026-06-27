using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nest.Application.Auth;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/user/api-keys")]
[Authorize]
public class ApiKeysController(IApiKeyService svc) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var keys = await svc.GetByUserAsync(UserId);
        return Ok(keys.Select(k => new ApiKeyDto(
            k.Id, k.Name, k.Prefix, k.CreatedAt, k.LastUsedAt, k.ExpiresAt)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Name is required.");

        var (entity, raw) = await svc.CreateAsync(UserId, req.Name.Trim());
        return Ok(new CreateApiKeyResponse(
            entity.Id, entity.Name, raw, entity.Prefix, entity.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id)
    {
        await svc.RevokeAsync(id, UserId);
        return NoContent();
    }
}
