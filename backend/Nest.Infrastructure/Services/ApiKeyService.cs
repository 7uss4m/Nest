using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Nest.Application.Auth;
using Nest.Domain.Entities;
using Nest.Infrastructure.Data;

namespace Nest.Infrastructure.Services;

public class ApiKeyService(NestDbContext db) : IApiKeyService
{
    public async Task<(ApiKey entity, string rawKey)> CreateAsync(Guid userId, string name)
    {
        var raw = "nst_" + Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLower();
        var entity = new ApiKey
        {
            UserId   = userId,
            Name     = name,
            KeyHash  = Hash(raw),
            Prefix   = raw[..12],
            CreatedAt = DateTime.UtcNow,
        };
        db.ApiKeys.Add(entity);
        await db.SaveChangesAsync();
        return (entity, raw);
    }

    public async Task<Guid?> ValidateAsync(string rawKey)
    {
        var hash = Hash(rawKey);
        var key = await db.ApiKeys
            .FirstOrDefaultAsync(k => k.KeyHash == hash && !k.IsRevoked);

        if (key is null) return null;
        if (key.ExpiresAt.HasValue && key.ExpiresAt < DateTime.UtcNow) return null;

        key.LastUsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return key.UserId;
    }

    public async Task RevokeAsync(Guid id, Guid userId)
    {
        var key = await db.ApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key is null) return;
        key.IsRevoked = true;
        await db.SaveChangesAsync();
    }

    public Task<List<ApiKey>> GetByUserAsync(Guid userId) =>
        db.ApiKeys
          .Where(k => k.UserId == userId && !k.IsRevoked)
          .OrderByDescending(k => k.CreatedAt)
          .ToListAsync();

    private static string Hash(string key) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key))).ToLower();
}
