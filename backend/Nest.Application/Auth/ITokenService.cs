namespace Nest.Application.Auth;

public record TokenUserInfo(Guid Id, string Email, string DisplayName);

public interface ITokenService
{
    string GenerateAccessToken(TokenUserInfo user, IList<string> roles);
    string GenerateRefreshToken();
    DateTime RefreshTokenExpiry { get; }
}
