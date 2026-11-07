using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace AppPOS.Api.Services.Auth;

/// <summary>SEC-01: nombres de los claims del JWT (sin el mapeo heredado de Microsoft).</summary>
public static class AppClaims
{
    public const string UserId = "sub";
    public const string Username = "name";
    public const string Role = "role";
    public const string SectionId = "section";
    public const string TokenVersion = "tv";
}

/// <summary>SEC-01: lectura del usuario autenticado desde el token.</summary>
public static class CurrentUserExtensions
{
    /// <summary>Id del usuario autenticado. Los endpoints protegidos siempre lo tienen.</summary>
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(AppClaims.UserId);
        return int.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("La solicitud no tiene un usuario autenticado.");
    }

    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole(Roles.Admin);

    /// <summary>Unidad fija del usuario (cajero); null si puede trabajar en todas (administrador).</summary>
    public static int? GetAssignedSectionId(this ClaimsPrincipal user)
    {
        if (user.IsAdmin()) return null;
        return int.TryParse(user.FindFirstValue(AppClaims.SectionId), out var id) ? id : null;
    }

    /// <summary>
    /// Unidad efectiva de la consulta/operación. El administrador usa la que pide (o ninguna); el
    /// cajero queda limitado a su unidad: si no envía una se usa la suya y si pide otra → 403.
    /// </summary>
    public static bool TryResolveSection(this ControllerBase controller, int? requested, out int? effective, out ObjectResult? forbidden)
    {
        forbidden = null;
        effective = requested;
        var user = controller.User;
        if (user.IsAdmin()) return true;

        var assigned = user.GetAssignedSectionId();
        if (!assigned.HasValue || (requested.HasValue && requested.Value != assigned.Value))
        {
            forbidden = controller.StatusCode(StatusCodes.Status403Forbidden,
                new { message = "No tienes acceso a esta unidad de negocio." });
            return false;
        }

        effective = assigned;
        return true;
    }
}
