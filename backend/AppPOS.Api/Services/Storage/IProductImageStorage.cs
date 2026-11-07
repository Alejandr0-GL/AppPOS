namespace AppPOS.Api.Services.Storage
{
    /// <summary>
    /// POS-07: almacenamiento de las imágenes de productos.
    ///
    /// El controlador sólo valida y delega aquí; dónde viven los archivos depende de la
    /// implementación registrada según <c>Storage:ProductImages:Provider</c>:
    /// <list type="bullet">
    /// <item><c>Local</c> (<see cref="LocalProductImageStorage"/>): carpeta en disco, configurable.</item>
    /// <item>Nube (pendiente): Azure Blob / S3 / R2… — implementar esta interfaz y registrarla en Program.cs.</item>
    /// </list>
    /// </summary>
    public interface IProductImageStorage
    {
        /// <summary>
        /// Guarda la imagen y devuelve la URL que se persiste en <c>Products.image_url</c>:
        /// relativa (p. ej. <c>/uploads/products/12-abc.png</c>) cuando la sirve la propia API,
        /// o absoluta (<c>https://…</c>) cuando la sirve un almacenamiento externo/CDN.
        /// </summary>
        Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken cancellationToken = default);

        /// <summary>
        /// Borra una imagen guardada por este almacenamiento. Ignora URLs que no le pertenecen
        /// (datos heredados, otro proveedor) y nunca lanza por un archivo inexistente.
        /// </summary>
        Task DeleteAsync(string? imageUrl, CancellationToken cancellationToken = default);
    }
}
