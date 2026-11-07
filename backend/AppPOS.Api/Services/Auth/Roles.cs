namespace AppPOS.Api.Services.Auth;

/// <summary>SEC-01: roles del sistema (valor guardado en <c>Users.role</c> y claim <c>role</c> del JWT).</summary>
public static class Roles
{
    /// <summary>Puede ver y modificar todo, en todas las unidades de negocio.</summary>
    public const string Admin = "ADMIN";

    /// <summary>Vende, cobra créditos y consulta en su unidad. No anula, no ajusta, no ve ganancias ni gastos.</summary>
    public const string Cashier = "CASHIER";

    public static readonly string[] All = { Admin, Cashier };

    public static string Label(string role) => role switch
    {
        Admin => "Administrador",
        Cashier => "Cajero",
        _ => role
    };
}
