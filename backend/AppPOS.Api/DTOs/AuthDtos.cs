namespace AppPOS.Api.DTOs
{
    // SEC-01: autenticación y administración de usuarios.

    public class LoginDto
    {
        public string? Username { get; set; }
        public string? Password { get; set; }
    }

    public class SessionUserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? FullName { get; set; }
        /// <summary>ADMIN | CASHIER.</summary>
        public string Role { get; set; } = string.Empty;
        /// <summary>Unidad fija del cajero; null en el administrador (todas).</summary>
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
    }

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        /// <summary>Vencimiento del token (UTC).</summary>
        public DateTime ExpiresAt { get; set; }
        public SessionUserDto User { get; set; } = new();
    }

    public class UserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string Role { get; set; } = string.Empty;
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastAccess { get; set; }
        /// <summary>Bloqueado temporalmente por intentos fallidos (hasta <see cref="LockoutUntil"/>).</summary>
        public bool IsLocked { get; set; }
        public DateTime? LockoutUntil { get; set; }
    }

    public class CreateUserDto
    {
        public string? Username { get; set; }
        public string? FullName { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
        /// <summary>Obligatoria para cajeros; se ignora en administradores.</summary>
        public int? SectionId { get; set; }
    }

    public class UpdateUserDto
    {
        public string? FullName { get; set; }
        public string? Role { get; set; }
        public int? SectionId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class ResetPasswordDto
    {
        public string? NewPassword { get; set; }
    }
}
