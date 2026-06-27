using Nest.Domain.Entities;

namespace Nest.Application.Auth;

public interface IApiKeyService
{
    Task<(ApiKey entity, string rawKey)> CreateAsync(Guid userId, string name);
    Task<Guid?> ValidateAsync(string rawKey);   // returns userId or null
    Task RevokeAsync(Guid id, Guid userId);
    Task<List<ApiKey>> GetByUserAsync(Guid userId);
}
