using AppPOS.Api.Models;
using AppPOS.Api.Services;
using AppPOS.Api.Services.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

app.UseAuthorization();
app.MapControllers();

app.UseRouting();


app.Run();
