namespace Nest.Application.Auth;

public record CreateApiKeyRequest(string Name);

public record CreateApiKeyResponse(
    Guid Id,
    string Name,
    string Key,       // raw key — shown only once
    string Prefix,
    DateTime CreatedAt);

public record ApiKeyDto(
    Guid Id,
    string Name,
    string Prefix,
    DateTime CreatedAt,
    DateTime? LastUsedAt,
    DateTime? ExpiresAt);
