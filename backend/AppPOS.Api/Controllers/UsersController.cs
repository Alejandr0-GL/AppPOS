using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using AppPOS.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppPOS.Api.Controllers
{
    /// <summary>
    /// SEC-01: administración de usuarios (sólo administrador). No hay DELETE: un usuario con ventas
    /// se desactiva para conservar quién hizo qué. Sólo el administrador cambia contraseñas.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = Roles.Admin)]
    public class UsersController : ControllerBase
    {
        private readonly AppPosDbContext _context;
        private readonly IPasswordHasher<User> _hasher;

        public UsersController(AppPosDbContext context, IPasswordHasher<User> hasher)
        {
            _context = context;
            _hasher = hasher;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var now = DateTime.Now;
            var users = await _context.Users.AsNoTracking()
                .OrderByDescending(user => user.IsActive)
                .ThenBy(user => user.Role)
                .ThenBy(user => user.Username)
                .Select(user => new UserDto
                {
                    UserId = user.UserId,
                    Username = user.Username,
                    FullName = user.FullName,
                    Role = user.Role,
                    SectionId = user.SectionId,
                    SectionName = user.Section != null ? user.Section.Name : null,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    LastAccess = user.LastAccess,
                    IsLocked = user.LockoutUntil != null && user.LockoutUntil > now,
                    LockoutUntil = user.LockoutUntil
                })
                .ToListAsync();

            return Ok(users);
        }

        // POST: api/Users
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            var username = UserRules.NormalizeUsername(dto.Username);
            var error = UserRules.ValidateUsername(username) ?? UserRules.ValidatePassword(dto.Password);
            if (error != null) return BadRequest(new { message = error });

            var (role, sectionId, roleError) = await ValidateRoleAndSectionAsync(dto.Role, dto.SectionId);
            if (roleError != null) return BadRequest(new { message = roleError });

            var fullName = NormalizeFullName(dto.FullName, out var nameError);
            if (nameError != null) return BadRequest(new { message = nameError });

            if (await _context.Users.AnyAsync(user => user.Username == username))
                return Conflict(new { message = $"Ya existe un usuario '{username}'." });

            var user = new User
            {
                Username = username,
                FullName = fullName,
                Role = role!,
                SectionId = sectionId,
                IsActive = true,
                CreatedAt = DateTime.Now
            };
            user.PasswordHash = _hasher.HashPassword(user, dto.Password!);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario creado correctamente.", userId = user.UserId });
        }

        // PUT: api/Users/5 — nombre, rol, unidad y estado (no el nombre de usuario ni la contraseña).
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.UserId == id);
            if (user == null) return NotFound(new { message = "Usuario no encontrado." });

            var (role, sectionId, roleError) = await ValidateRoleAndSectionAsync(dto.Role, dto.SectionId);
            if (roleError != null) return BadRequest(new { message = roleError });

            var fullName = NormalizeFullName(dto.FullName, out var nameError);
            if (nameError != null) return BadRequest(new { message = nameError });

            var isSelf = id == User.GetUserId();
            if (isSelf && (!dto.IsActive || role != Roles.Admin))
                return BadRequest(new { message = "No puedes desactivarte ni quitarte el rol de administrador a ti mismo." });

            var losesAdmin = user.Role == Roles.Admin && user.IsActive && (role != Roles.Admin || !dto.IsActive);
            if (losesAdmin && !await _context.Users.AnyAsync(item => item.UserId != id && item.Role == Roles.Admin && item.IsActive))
                return BadRequest(new { message = "Debe quedar al menos un administrador activo." });

            // Cambiar rol, unidad o estado cierra las sesiones abiertas de ese usuario.
            if (user.Role != role || user.SectionId != sectionId || user.IsActive != dto.IsActive)
                user.TokenVersion++;

            user.FullName = fullName;
            user.Role = role!;
            user.SectionId = sectionId;
            user.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Usuario actualizado correctamente.", userId = user.UserId });
        }

        // PUT: api/Users/5/password — el administrador asigna una contraseña nueva (y desbloquea).
        [HttpPut("{id:int}/password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(item => item.UserId == id);
            if (user == null) return NotFound(new { message = "Usuario no encontrado." });

            var error = UserRules.ValidatePassword(dto.NewPassword);
            if (error != null) return BadRequest(new { message = error });

            user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword!);
            user.FailedLoginAttempts = 0;
            user.LockoutUntil = null;
            user.TokenVersion++; // cierra las sesiones abiertas con la contraseña anterior
            await _context.SaveChangesAsync();

            return Ok(new { message = "Contraseña actualizada. El usuario debe iniciar sesión de nuevo.", userId = user.UserId });
        }

        private async Task<(string? Role, int? SectionId, string? Error)> ValidateRoleAndSectionAsync(string? rawRole, int? sectionId)
        {
            var role = rawRole?.Trim().ToUpperInvariant();
            if (role is null || !Roles.All.Contains(role))
                return (null, null, "El rol debe ser Administrador (ADMIN) o Cajero (CASHIER).");

            // El administrador trabaja en todas las unidades.
            if (role == Roles.Admin) return (role, null, null);

            if (!sectionId.HasValue)
                return (null, null, "El cajero debe tener una unidad de negocio asignada.");
            if (!await _context.Sections.AnyAsync(section => section.SectionId == sectionId.Value && section.IsActive))
                return (null, null, "La unidad de negocio seleccionada no existe o está inactiva.");

            return (role, sectionId, null);
        }

        private static string? NormalizeFullName(string? fullName, out string? error)
        {
            error = null;
            var value = fullName?.Trim();
            if (string.IsNullOrEmpty(value)) return null;
            if (value.Length > 100) error = "El nombre no puede superar 100 caracteres.";
            return value;
        }
    }
}
