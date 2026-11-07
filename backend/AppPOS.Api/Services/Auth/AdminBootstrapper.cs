using AppPOS.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AppPOS.Api.Services.Auth;

/// <summary>
/// SEC-01: primer acceso. Si no hay ningún administrador activo con una contraseña real (p. ej. el
/// usuario <c>admin</c> heredado con <c>hash_de_prueba</c>), al arrancar se le asigna
/// <c>Auth:BootstrapAdminPassword</c> (o se crea <c>admin</c> si no existe). Después de eso la
/// opción se ignora: las contraseñas se administran desde la pantalla Usuarios.
/// </summary>
public static class AdminBootstrapper
{
    public const string DefaultAdminUsername = "admin";

    /// <summary>Un hash válido de <see cref="PasswordHasher{TUser}"/> (formato V3, base64 que empieza con 0x01).</summary>
    public static bool IsRealPasswordHash(string? hash)
    {
        if (string.IsNullOrWhiteSpace(hash)) return false;
        try
        {
            var bytes = Convert.FromBase64String(hash);
            return bytes.Length > 13 && bytes[0] == 0x01;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public static async Task RunAsync(IServiceProvider services, ILogger logger)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppPosDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        var options = scope.ServiceProvider.GetRequiredService<IOptions<AuthOptions>>().Value;

        var admins = await context.Users.Where(user => user.Role == Roles.Admin && user.IsActive).ToListAsync();
        if (admins.Any(admin => IsRealPasswordHash(admin.PasswordHash)))
        {
            if (!string.IsNullOrWhiteSpace(options.BootstrapAdminPassword))
                logger.LogWarning("Auth:BootstrapAdminPassword está definida pero ya existe un administrador con contraseña: se ignora. Puedes quitarla de la configuración.");
            return;
        }

        var password = options.BootstrapAdminPassword?.Trim();
        if (string.IsNullOrEmpty(password))
        {
            logger.LogWarning("No hay ningún administrador con contraseña. Define Auth:BootstrapAdminPassword (o la variable Auth__BootstrapAdminPassword) y reinicia la API para habilitar el usuario '{Username}'.", DefaultAdminUsername);
            return;
        }

        if (password.Length < UserRules.MinPasswordLength)
        {
            logger.LogError("Auth:BootstrapAdminPassword debe tener al menos {Min} caracteres. No se habilitó el administrador.", UserRules.MinPasswordLength);
            return;
        }

        var admin = await context.Users.FirstOrDefaultAsync(user => user.Username == DefaultAdminUsername)
            ?? admins.FirstOrDefault();

        if (admin == null)
        {
            admin = new User
            {
                Username = DefaultAdminUsername,
                FullName = "Administrador",
                Role = Roles.Admin,
                IsActive = true,
                CreatedAt = DateTime.Now,
                PasswordHash = string.Empty
            };
            context.Users.Add(admin);
        }

        admin.Role = Roles.Admin;
        admin.IsActive = true;
        admin.SectionId = null;
        admin.PasswordHash = hasher.HashPassword(admin, password);
        admin.FailedLoginAttempts = 0;
        admin.LockoutUntil = null;
        admin.TokenVersion++;
        await context.SaveChangesAsync();

        logger.LogWarning("Se habilitó el administrador '{Username}' con Auth:BootstrapAdminPassword. Inicia sesión, crea los cajeros y quita esa opción de la configuración.", admin.Username);
    }
}

/// <summary>SEC-01: reglas compartidas de usuarios y contraseñas.</summary>
public static class UserRules
{
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 100;

    /// <summary>Usuario de 3 a 20 caracteres: minúsculas, números, punto, guion o guion bajo.</summary>
    public static string? ValidateUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username)) return "El nombre de usuario es obligatorio.";
        if (username.Length is < 3 or > 20) return "El nombre de usuario debe tener entre 3 y 20 caracteres.";
        if (!username.All(c => c is >= 'a' and <= 'z' or >= '0' and <= '9' or '.' or '_' or '-'))
            return "El nombre de usuario sólo puede tener letras minúsculas sin tildes, números, punto, guion o guion bajo.";
        return null;
    }

    public static string NormalizeUsername(string? username) => (username ?? string.Empty).Trim().ToLowerInvariant();

    public static string? ValidatePassword(string? password)
    {
        if (string.IsNullOrEmpty(password)) return "La contraseña es obligatoria.";
        if (password.Length < MinPasswordLength) return $"La contraseña debe tener al menos {MinPasswordLength} caracteres.";
        if (password.Length > MaxPasswordLength) return $"La contraseña no puede superar {MaxPasswordLength} caracteres.";
        return null;
    }
}
