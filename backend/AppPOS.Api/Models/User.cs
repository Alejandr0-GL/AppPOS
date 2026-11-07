using System;
using System.Collections.Generic;

namespace AppPOS.Api.Models;

public partial class User
{
    public int UserId { get; set; }

    public string Username { get; set; } = null!;

    /// <summary>SEC-01: hash PBKDF2 de <c>PasswordHasher</c> de ASP.NET Core (nunca la contraseña en claro).</summary>
    public string PasswordHash { get; set; } = null!;

    /// <summary>SEC-01: <c>ADMIN</c> o <c>CASHIER</c> (ver <c>Auth.Roles</c>).</summary>
    public string Role { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastAccess { get; set; }

    /// <summary>SEC-01: nombre para mostrar (barra superior, historial). Opcional.</summary>
    public string? FullName { get; set; }

    /// <summary>
    /// SEC-01: unidad de negocio fija del cajero (obligatoria para CASHIER). NULL en el
    /// administrador, que puede trabajar en todas las unidades.
    /// </summary>
    public int? SectionId { get; set; }

    /// <summary>SEC-01: intentos fallidos seguidos; al llegar al límite se bloquea temporalmente.</summary>
    public int FailedLoginAttempts { get; set; }

    /// <summary>SEC-01: fin del bloqueo temporal por intentos fallidos (NULL = sin bloqueo).</summary>
    public DateTime? LockoutUntil { get; set; }

    /// <summary>
    /// SEC-01: versión de sesión. Se incrementa al cambiar contraseña, rol, unidad o al
    /// desactivar el usuario, e invalida los tokens emitidos antes (claim <c>tv</c>).
    /// </summary>
    public int TokenVersion { get; set; }

    public virtual Section? Section { get; set; }

    public virtual ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();

    public virtual ICollection<Expense> Expenses { get; set; } = new List<Expense>();

    public virtual ICollection<StockMovement> StockMovements { get; set; } = new List<StockMovement>();
}
