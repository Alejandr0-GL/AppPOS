namespace AppPOS.Api.Services.Storage
{
    /// <summary>
    /// Sección <c>Storage:ProductImages</c> de la configuración (appsettings / variables de entorno,
    /// p. ej. <c>Storage__ProductImages__LocalPath</c>). Todos los valores tienen default:
    /// sin configurar nada se comporta como en desarrollo (carpeta wwwroot/uploads/products).
    /// </summary>
    public class ProductImageStorageOptions
    {
        public const string SectionName = "Storage:ProductImages";

        /// <summary><c>Local</c> (único implementado por ahora).</summary>
        public string Provider { get; set; } = "Local";

        /// <summary>
        /// Carpeta donde se guardan los archivos (proveedor Local). Absoluta o relativa al
        /// directorio de la API. En un servidor conviene ponerla FUERA de la carpeta publicada
        /// para que un redespliegue no borre las fotos (p. ej. <c>/var/apppos/product-images</c>).
        /// </summary>
        public string LocalPath { get; set; } = "wwwroot/uploads/products";

        /// <summary>Ruta pública con la que la API sirve los archivos locales.</summary>
        public string RequestPath { get; set; } = "/uploads/products";

        /// <summary>
        /// Opcional: URL base pública (CDN o dominio de archivos). Si se define, se guarda la URL
        /// absoluta <c>{PublicBaseUrl}/{archivo}</c> en vez de la ruta relativa.
        /// </summary>
        public string? PublicBaseUrl { get; set; }
    }
}
