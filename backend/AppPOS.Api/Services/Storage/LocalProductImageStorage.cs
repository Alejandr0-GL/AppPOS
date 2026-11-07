using Microsoft.Extensions.Options;

namespace AppPOS.Api.Services.Storage
{
    /// <summary>
    /// Guarda las imágenes en una carpeta del disco y la API las sirve como archivos estáticos
    /// (ver <c>UseStaticFiles</c> en Program.cs). Apto para desarrollo, un VPS o un servidor
    /// propio con la carpeta persistida/respaldada; NO para PaaS con disco efímero.
    /// </summary>
    public class LocalProductImageStorage : IProductImageStorage
    {
        private readonly ProductImageStorageOptions _options;
        private readonly ILogger<LocalProductImageStorage> _logger;

        public LocalProductImageStorage(IOptions<ProductImageStorageOptions> options, IWebHostEnvironment environment, ILogger<LocalProductImageStorage> logger)
        {
            _options = options.Value;
            _logger = logger;
            RootPath = ResolveRootPath(_options.LocalPath, environment.ContentRootPath);
        }

        /// <summary>Ruta absoluta de la carpeta de imágenes.</summary>
        public string RootPath { get; }

        public static string ResolveRootPath(string localPath, string contentRootPath) =>
            Path.GetFullPath(Path.IsPathRooted(localPath) ? localPath : Path.Combine(contentRootPath, localPath));

        public async Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default)
        {
            Directory.CreateDirectory(RootPath);

            var safeName = Path.GetFileName(fileName);
            await using (var target = File.Create(Path.Combine(RootPath, safeName)))
            {
                await content.CopyToAsync(target, cancellationToken);
            }

            return string.IsNullOrWhiteSpace(_options.PublicBaseUrl)
                ? $"{NormalizedRequestPath}/{safeName}"
                : $"{_options.PublicBaseUrl.TrimEnd('/')}/{safeName}";
        }

        public Task DeleteAsync(string? imageUrl, CancellationToken cancellationToken = default)
        {
            var fileName = OwnFileName(imageUrl);
            if (fileName == null) return Task.CompletedTask;

            var fullPath = Path.GetFullPath(Path.Combine(RootPath, fileName));
            if (!fullPath.StartsWith(RootPath, StringComparison.OrdinalIgnoreCase)) return Task.CompletedTask;

            try
            {
                if (File.Exists(fullPath)) File.Delete(fullPath);
            }
            catch (IOException ex)
            {
                // Un archivo en uso no debe tumbar la operación: queda huérfano en disco.
                _logger.LogWarning(ex, "No se pudo borrar la imagen {Path}", fullPath);
            }

            return Task.CompletedTask;
        }

        private string NormalizedRequestPath => "/" + _options.RequestPath.Trim('/');

        /// <summary>Nombre del archivo si la URL pertenece a este almacenamiento; si no, null.</summary>
        private string? OwnFileName(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return null;

            var prefixes = new List<string> { NormalizedRequestPath + "/" };
            if (!string.IsNullOrWhiteSpace(_options.PublicBaseUrl)) prefixes.Add(_options.PublicBaseUrl.TrimEnd('/') + "/");

            var prefix = prefixes.FirstOrDefault(item => imageUrl.StartsWith(item, StringComparison.OrdinalIgnoreCase));
            if (prefix == null) return null;

            var fileName = imageUrl[prefix.Length..];
            return string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName) ? null : fileName;
        }
    }
}
