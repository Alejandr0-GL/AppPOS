using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AppPOS.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AppPOS.Api.Services.Auth;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(User user);
}

/// <summary>SEC-01: emite el JWT de sesión (HMAC-SHA256).</summary>
public class TokenService : ITokenService
{
    private readonly AuthOptions _options;

    public TokenService(IOptions<AuthOptions> options)
    {
        _options = options.Value;
    }

    public static SymmetricSecurityKey SigningKey(string key) => new(Encoding.UTF8.GetBytes(key));

    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddHours(_options.Jwt.ExpirationHours);

        var claims = new List<Claim>
        {
            new(AppClaims.UserId, user.UserId.ToString()),
            new(AppClaims.Username, user.Username),
            new(AppClaims.Role, user.Role),
            new(AppClaims.TokenVersion, user.TokenVersion.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };
        if (user.SectionId.HasValue)
            claims.Add(new Claim(AppClaims.SectionId, user.SectionId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: _options.Jwt.Issuer,
            audience: _options.Jwt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(SigningKey(_options.Jwt.Key), SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
