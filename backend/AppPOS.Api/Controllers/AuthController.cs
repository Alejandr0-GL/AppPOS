using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using AppPOS.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AppPOS.Api.Controllers
{
    /// <summary>SEC-01: inicio de sesión con JWT y datos de la sesión actual.</summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private const string InvalidCredentialsMessage = "Usuario o contraseña incorrectos.";

        private readonly AppPosDbContext _context;
        private readonly IPasswordHasher<User> _hasher;
        private readonly ITokenService _tokenService;
        private readonly AuthOptions _options;

        public AuthController(AppPosDbContext context, IPasswordHasher<User> hasher, ITokenService tokenService, IOptions<AuthOptions> options)
        {
            _context = context;
            _hasher = hasher;
            _tokenService = tokenService;
            _options = options.Value;
        }

        // POST: api/Auth/login
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var username = UserRules.NormalizeUsername(dto?.Username);
            var password = dto?.Password ?? string.Empty;
            if (username.Length == 0 || password.Length == 0)
                return BadRequest(new { message = "Ingresa el usuario y la contraseña." });

            var user = await _context.Users.Include(u => u.Section).FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
                return Unauthorized(new { message = InvalidCredentialsMessage });

            var now = DateTime.Now;
            if (user.LockoutUntil.HasValue && user.LockoutUntil.Value > now)
                return LockedResponse(user.LockoutUntil.Value, now);

            var verification = AdminBootstrapper.IsRealPasswordHash(user.PasswordHash)
                ? _hasher.VerifyHashedPassword(user, user.PasswordHash, password)
                : PasswordVerificationResult.Failed;

            if (verification == PasswordVerificationResult.Failed)
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= _options.MaxFailedAttempts)
                {
                    user.FailedLoginAttempts = 0;
                    user.LockoutUntil = now.AddMinutes(_options.LockoutMinutes);
                    await _context.SaveChangesAsync();
                    return LockedResponse(user.LockoutUntil.Value, now);
                }

                await _context.SaveChangesAsync();
                var remaining = _options.MaxFailedAttempts - user.FailedLoginAttempts;
                return Unauthorized(new
                {
                    message = remaining <= 2
                        ? $"{InvalidCredentialsMessage} Te quedan {remaining} intento(s) antes del bloqueo temporal."
                        : InvalidCredentialsMessage
                });
            }

            if (!user.IsActive)
                return Unauthorized(new { message = "Tu usuario está desactivado. Habla con el administrador." });

            if (user.Role == Roles.Cashier && !user.SectionId.HasValue)
                return Unauthorized(new { message = "Tu usuario no tiene una unidad de negocio asignada. Habla con el administrador." });

            if (verification == PasswordVerificationResult.SuccessRehashNeeded)
                user.PasswordHash = _hasher.HashPassword(user, password);

            user.FailedLoginAttempts = 0;
            user.LockoutUntil = null;
            user.LastAccess = now;
            await _context.SaveChangesAsync();

            var (token, expiresAt) = _tokenService.CreateToken(user);
            return Ok(new LoginResponseDto { Token = token, ExpiresAt = expiresAt, User = ToSessionUser(user) });
        }

        // GET: api/Auth/me
        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = User.GetUserId();
            var user = await _context.Users.AsNoTracking().Include(u => u.Section).FirstOrDefaultAsync(u => u.UserId == userId);
            return user == null ? Unauthorized() : Ok(ToSessionUser(user));
        }

        private ObjectResult LockedResponse(DateTime lockoutUntil, DateTime now)
        {
            var minutes = Math.Max(1, (int)Math.Ceiling((lockoutUntil - now).TotalMinutes));
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = $"Usuario bloqueado por intentos fallidos. Intenta de nuevo en {minutes} minuto(s) o pide al administrador que restablezca tu contraseña."
            });
        }

        internal static SessionUserDto ToSessionUser(User user) => new()
        {
            UserId = user.UserId,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role,
            SectionId = user.Role == Roles.Admin ? null : user.SectionId,
            SectionName = user.Role == Roles.Admin ? null : user.Section?.Name
        };
    }
}
