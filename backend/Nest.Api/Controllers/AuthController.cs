using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nest.Application.Auth;
using Nest.Application.Common;
using Nest.Domain.Entities;
using Nest.Infrastructure.Data;

namespace Nest.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> userManager,
    ITokenService tokenService,
    INestDbContext db) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
    {
        var user = new AppUser
        {
            UserName = req.Email,
            Email = req.Email,
            DisplayName = req.DisplayName,
        };

        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        return await IssueTokens(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
    {
        var user = await userManager.FindByEmailAsync(req.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized("Invalid credentials.");

        return await IssueTokens(user);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest req)
    {
        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == req.RefreshToken && !t.IsRevoked);

        if (token is null || token.ExpiresAt < DateTime.UtcNow)
            return Unauthorized("Invalid or expired refresh token.");

        var user = await userManager.FindByIdAsync(token.UserId.ToString());
        if (user is null) return Unauthorized();

        token.IsRevoked = true;
        await db.SaveChangesAsync();

        return await IssueTokens(user);
    }

    private async Task<AuthResponse> IssueTokens(AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var userInfo = new TokenUserInfo(user.Id, user.Email!, user.DisplayName);
        var accessToken = tokenService.GenerateAccessToken(userInfo, roles);
        var refreshTokenStr = tokenService.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenStr,
            ExpiresAt = tokenService.RefreshTokenExpiry,
        });
        await db.SaveChangesAsync();

        return new AuthResponse(
            accessToken,
            refreshTokenStr,
            tokenService.RefreshTokenExpiry,
            new UserDto(user.Id, user.Email!, user.DisplayName, user.AvatarUrl));
    }
}
