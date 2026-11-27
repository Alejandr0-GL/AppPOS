using AppPOS.Api.Models;
using AppPOS.Api.Services;
using AppPOS.Api.Services.Auth;
using AppPOS.Api.Services.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Despliegue local: permite instalar la API como servicio de Windows (sc.exe create ...).
// Fuera de un servicio (dotnet run, Docker, Linux) no hace nada.
builder.Host.UseWindowsService();

var myAllowSpecificOrigins = "_myAllowSpecificOrigins";

// POS-07: orígenes permitidos configurables (Cors:AllowedOrigins). En la nube se agrega el
// dominio del frontend publicado, p. ej. variable de entorno Cors__AllowedOrigins__0=https://pos.midominio.com
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() is { Length: > 0 } configuredOrigins
    ? configuredOrigins
    : new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: myAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins(allowedOrigins)
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

builder.Services.AddDbContext<AppPosDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IStockService, StockService>();

// POS-07: almacenamiento de imágenes de productos (Storage:ProductImages). Para la nube se
// implementa IProductImageStorage (Azure Blob / S3 / R2…) y se registra aquí según Provider.
builder.Services.Configure<ProductImageStorageOptions>(builder.Configuration.GetSection(ProductImageStorageOptions.SectionName));
var imageStorageOptions = builder.Configuration.GetSection(ProductImageStorageOptions.SectionName).Get<ProductImageStorageOptions>()
    ?? new ProductImageStorageOptions();

switch (imageStorageOptions.Provider.Trim().ToLowerInvariant())
{
    case "local":
        builder.Services.AddSingleton<IProductImageStorage, LocalProductImageStorage>();
        break;
    default:
        throw new InvalidOperationException(
            $"Storage:ProductImages:Provider '{imageStorageOptions.Provider}' no está soportado. Valores válidos: Local.");
}

// SEC-01: autenticación JWT. Toda la API exige sesión (FallbackPolicy) salvo [AllowAnonymous]
// (login); las acciones de administrador usan [Authorize(Roles = Roles.Admin)].
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
var authOptions = builder.Configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();
if (string.IsNullOrWhiteSpace(authOptions.Jwt.Key) || authOptions.Jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Falta Auth:Jwt:Key (mínimo 32 caracteres). Defínela en appsettings.json (no versionado) o en la variable de entorno Auth__Jwt__Key.");
}

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<ITokenService, TokenService>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // claims con su nombre corto: sub, name, role, section, tv
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = authOptions.Jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = authOptions.Jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = TokenService.SigningKey(authOptions.Jwt.Key),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = AppClaims.Username,
            RoleClaimType = AppClaims.Role
        };
        options.Events = new JwtBearerEvents
        {
            // Un token deja de valer si el usuario se desactivó o si cambió su contraseña, rol o unidad.
            OnTokenValidated = async context =>
            {
                var principal = context.Principal!;
                if (!int.TryParse(principal.FindFirst(AppClaims.UserId)?.Value, out var userId)
                    || !int.TryParse(principal.FindFirst(AppClaims.TokenVersion)?.Value, out var tokenVersion))
                {
                    context.Fail("Token incompleto.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppPosDbContext>();
                var current = await db.Users.AsNoTracking()
                    .Where(user => user.UserId == userId)
                    .Select(user => new { user.IsActive, user.TokenVersion })
                    .FirstOrDefaultAsync();

                if (current == null || !current.IsActive || current.TokenVersion != tokenVersion)
                    context.Fail("La sesión ya no es válida.");
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // SEC-01: botón "Authorize" en Swagger para probar con el token de POST /api/Auth/login.
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Token de POST /api/Auth/login"
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

var app = builder.Build();

// Despliegue: aplica las migraciones pendientes al arrancar (Database:ApplyMigrationsOnStartup).
// En desarrollo queda apagado y se sigue usando `dotnet ef database update`.
if (builder.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppPosDbContext>().Database.MigrateAsync();
}

app.UseCors(myAllowSpecificOrigins);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// POS-07: imágenes de productos guardadas en disco (proveedor Local), servidas desde la carpeta
// configurada (puede estar fuera de wwwroot para sobrevivir a los redespliegues).
if (app.Services.GetRequiredService<IProductImageStorage>() is LocalProductImageStorage localImageStorage)
{
    Directory.CreateDirectory(localImageStorage.RootPath);
    var requestPath = "/" + app.Services.GetRequiredService<IOptions<ProductImageStorageOptions>>().Value.RequestPath.Trim('/');
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(localImageStorage.RootPath),
        RequestPath = requestPath
    });
}

app.UseStaticFiles();

// SEC-01: las imágenes (archivos estáticos, arriba) siguen siendo públicas; los endpoints no.
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Despliegue: si el build de Angular se copió a wwwroot, la API sirve también el frontend
// (mismo origen, apiUrl '/api'). Las rutas de Angular (/pos, /products…) caen en index.html;
// una ruta /api inexistente sigue respondiendo 404 en vez de devolver la página.
if (File.Exists(Path.Combine(app.Environment.WebRootPath ?? string.Empty, "index.html")))
{
    app.MapFallback("/api/{**rest}", () => Results.NotFound()).AllowAnonymous();
    app.MapFallbackToFile("index.html").AllowAnonymous();
}

// SEC-01: primer acceso del administrador (Auth:BootstrapAdminPassword).
await AdminBootstrapper.RunAsync(app.Services, app.Logger);

app.Run();
