namespace AppPOS.Api.Services.Auth;

/// <summary>SEC-01: sección <c>Auth</c> de la configuración (appsettings o variables <c>Auth__...</c>).</summary>
public class AuthOptions
{
    public const string SectionName = "Auth";

    public JwtSettings Jwt { get; set; } = new();

    /// <summary>
    /// Contraseña con la que se habilita al usuario <c>admin</c> la primera vez (sólo si todavía no hay
    /// ningún administrador activo con contraseña real). Una vez usada se ignora; conviene quitarla.
    /// </summary>
    public string? BootstrapAdminPassword { get; set; }

    /// <summary>Intentos fallidos seguidos antes del bloqueo temporal.</summary>
    public int MaxFailedAttempts { get; set; } = 5;

    /// <summary>Duración del bloqueo temporal.</summary>
    public int LockoutMinutes { get; set; } = 5;

    public class JwtSettings
    {
        /// <summary>Clave HMAC-SHA256 (mínimo 32 caracteres). Nunca se versiona: appsettings.json local o <c>Auth__Jwt__Key</c>.</summary>
        public string Key { get; set; } = string.Empty;
        public string Issuer { get; set; } = "AppPOS";
        public string Audience { get; set; } = "AppPOS";
        /// <summary>Vigencia del token: un turno completo. Al vencer se vuelve a iniciar sesión.</summary>
        public int ExpirationHours { get; set; } = 12;
    }
}
