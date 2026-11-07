using AppPOS.Api.DTOs;
using AppPOS.Api.Models;
using AppPOS.Api.Services.Storage;
using AppPOS.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AppPOS.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly AppPosDbContext _context;
        private readonly IProductImageStorage _imageStorage;

        public ProductsController(AppPosDbContext context, IProductImageStorage imageStorage)
        {
            _context = context;
            _imageStorage = imageStorage;
        }
        // GET: api/Products?sectionId=1&search=oil&includeInactive=false
        [HttpGet]
        public async Task<IActionResult> GetProducts([FromQuery] int? sectionId, [FromQuery] string? search, [FromQuery] bool includeInactive = false, [FromQuery] string? status = null)
        {
            // SEC-01: el cajero sólo ve el catálogo de su unidad.
            if (!this.TryResolveSection(sectionId, out var effectiveSectionId, out var forbidden)) return forbidden!;
            sectionId = effectiveSectionId;

            var query = _context.Products.AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLowerInvariant();

                if (normalizedStatus == "inactive")
                {
                    query = query.Where(product => !product.IsActive);
                }
                else if (normalizedStatus != "all")
                {
                    query = query.Where(product => product.IsActive);
                }
            }
            else if (!includeInactive)
            {
                query = query.Where(product => product.IsActive);
            }

            if (sectionId.HasValue)
            {
                // Los productos se asocian a la unidad por inventario; los servicios por su categoría.
                query = query.Where(product =>
                    product.Inventories.Any(inventory => inventory.SectionId == sectionId.Value)
                    || (product.IsService && product.Category != null && product.Category.SectionId == sectionId.Value)
                    // POS-07: los ítems "Otros" están disponibles en todas las unidades de negocio.
                    || product.IsOpenItem);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(product => product.Name.Contains(search) ||
                    product.Sku.Contains(search) ||
                    (product.Barcode != null && product.Barcode.Contains(search)));
            }

            return Ok(await ProjectProducts(query, sectionId).ToListAsync());
        }

        // GET: api/Products/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await ProjectProducts(_context.Products.Where(item => item.ProductId == id), null)
                .FirstOrDefaultAsync();

            if (product == null)
            {
                return NotFound();
            }

            return Ok(product);
        }

        // POST: api/Products
        [HttpPost]
        [Authorize(Roles = Roles.Admin)] // SEC-01
        public async Task<IActionResult> PostProduct([FromBody] CreateProductDto dto)
        {
            // POS-07: un ítem abierto ("Otros") nunca maneja inventario.
            if (dto.IsOpenItem) dto.IsService = true;

            var validationError = await ValidateProduct(dto.Name, dto.Sku, dto.Barcode, dto.CategoryId, dto.TaxId, dto.PurchasePrice, dto.SalePrice, dto.SectionId, dto.InitialStock, dto.MinStock);
            if (validationError != null) return BadRequest(new { message = validationError });

            if (await _context.Products.AnyAsync(product => product.Sku == dto.Sku))
                return Conflict(new { message = "El SKU ya está registrado." });

            if (!string.IsNullOrWhiteSpace(dto.Barcode) && await _context.Products.AnyAsync(product => product.Barcode == dto.Barcode))
                return Conflict(new { message = "El código de barras ya está registrado." });

            var percentagesError = ValidatePercentages(dto.EmployeeCommissionPercentage, dto.BusinessProfitPercentage);
            if (percentagesError != null) return BadRequest(new { message = percentagesError });

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var product = new Product
                {
                    Name = dto.Name.Trim(),
                    Sku = dto.Sku.Trim(),
                    Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim(),
                    Description = dto.Description,
                    CategoryId = dto.CategoryId,
                    TaxId = dto.TaxId,
                    PurchasePrice = dto.PurchasePrice,
                    SalePrice = dto.SalePrice,
                    IsActive = true,
                    IsService = dto.IsService,
                    IsOpenItem = dto.IsOpenItem,
                    EmployeeCommissionPercentage = dto.EmployeeCommissionPercentage,
                    BusinessProfitPercentage = dto.BusinessProfitPercentage,
                    CreatedAt = DateTime.Now
                };

                _context.Products.Add(product);
                await _context.SaveChangesAsync();

                // Los servicios no manejan inventario: se venden sin descontar stock.
                if (!dto.IsService)
                {
                    _context.Inventories.Add(new Inventory
                    {
                        ProductId = product.ProductId,
                        SectionId = dto.SectionId,
                        CurrentStock = dto.InitialStock,
                        MinStock = dto.MinStock,
                        UpdatedAt = DateTime.Now
                    });

                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetProduct), new { id = product.ProductId }, new { productId = product.ProductId, message = "Producto creado correctamente." });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "No se pudo crear el producto. Verifica que SKU y código de barras sean únicos." });
            }
        }

        // PUT: api/Products/5
        [HttpPut("{id}")]
        [Authorize(Roles = Roles.Admin)] // SEC-01
        public async Task<IActionResult> PutProduct(int id, [FromBody] UpdateProductDto dto)
        {
            // POS-07: un ítem abierto ("Otros") nunca maneja inventario.
            if (dto.IsOpenItem) dto.IsService = true;

            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Producto no encontrado." });

            var validationError = await ValidateProduct(dto.Name, dto.Sku, dto.Barcode, dto.CategoryId, dto.TaxId, dto.PurchasePrice, dto.SalePrice, null, null, null);
            if (validationError != null) return BadRequest(new { message = validationError });

            var percentagesError = ValidatePercentages(dto.EmployeeCommissionPercentage, dto.BusinessProfitPercentage);
            if (percentagesError != null) return BadRequest(new { message = percentagesError });

            var categorySectionId = await _context.Categories
                .Where(category => category.CategoryId == dto.CategoryId)
                .Select(category => (int?)category.SectionId)
                .FirstOrDefaultAsync();
            if (!categorySectionId.HasValue)
                return BadRequest(new { message = "La categoría seleccionada no pertenece a una unidad de negocio." });

            // Los servicios no tienen inventario; los productos deben tener su fila en la unidad de la categoría.
            if (!dto.IsService && !await _context.Inventories.AnyAsync(inventory => inventory.ProductId == id && inventory.SectionId == categorySectionId.Value))
                return BadRequest(new { message = "La categoría seleccionada no pertenece a una unidad de negocio asociada al producto." });

            if (await _context.Products.AnyAsync(item => item.ProductId != id && item.Sku == dto.Sku))
                return Conflict(new { message = "El SKU ya está registrado." });

            if (!string.IsNullOrWhiteSpace(dto.Barcode) && await _context.Products.AnyAsync(item => item.ProductId != id && item.Barcode == dto.Barcode))
                return Conflict(new { message = "El código de barras ya está registrado." });

            product.Name = dto.Name.Trim();
            product.Sku = dto.Sku.Trim();
            product.Barcode = string.IsNullOrWhiteSpace(dto.Barcode) ? null : dto.Barcode.Trim();
            product.Description = dto.Description;
            product.CategoryId = dto.CategoryId;
            product.TaxId = dto.TaxId;
            product.PurchasePrice = dto.PurchasePrice;
            product.SalePrice = dto.SalePrice;
            product.IsActive = dto.IsActive;
            product.IsService = dto.IsService;
            product.IsOpenItem = dto.IsOpenItem;
            product.EmployeeCommissionPercentage = dto.EmployeeCommissionPercentage;
            product.BusinessProfitPercentage = dto.BusinessProfitPercentage;
            product.UpdatedAt = DateTime.Now;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Products.Any(e => e.ProductId == id))
                {
                    return NotFound();
                }
                throw;
            }

            return Ok(new { message = "Producto actualizado correctamente." });
        }

        // DELETE: api/Products/5
        [HttpDelete("{id}")]
        [Authorize(Roles = Roles.Admin)] // SEC-01
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }
            product.IsActive = false;
            product.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ---- POS-07: imagen del producto (se muestra en las tarjetas del POS) ----

        private const long MaxImageBytes = 2 * 1024 * 1024; // 2 MB

        // POST: api/Products/5/image  (multipart/form-data, campo "file")
        // Dónde se guarda el archivo lo decide IProductImageStorage (configuración Storage:ProductImages).
        [HttpPost("{id:int}/image")]
        [Authorize(Roles = Roles.Admin)] // SEC-01
        [RequestSizeLimit(MaxImageBytes + 64 * 1024)]
        public async Task<IActionResult> UploadProductImage(int id, IFormFile? file)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Producto no encontrado." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Selecciona una imagen." });

            if (file.Length > MaxImageBytes)
                return BadRequest(new { message = "La imagen no puede superar 2 MB." });

            // Se valida por contenido (firma del archivo), no por la extensión o el Content-Type que envía el cliente.
            var header = new byte[12];
            await using (var stream = file.OpenReadStream())
            {
                _ = await stream.ReadAsync(header.AsMemory(0, header.Length));
            }

            var extension = DetectImageExtension(header);
            if (extension == null)
                return BadRequest(new { message = "Formato no soportado. Usa JPG, PNG o WEBP." });

            // Nombre generado por el servidor: evita rutas manipuladas y fuerza a refrescar la caché del navegador.
            var fileName = $"{id}-{Guid.NewGuid():N}{extension}";
            string newImageUrl;
            await using (var stream = file.OpenReadStream())
            {
                newImageUrl = await _imageStorage.SaveAsync(stream, fileName, ImageContentTypes[extension], HttpContext.RequestAborted);
            }

            var previousImageUrl = product.ImageUrl;
            product.ImageUrl = newImageUrl;
            product.UpdatedAt = DateTime.Now;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Si no se pudo registrar en BD, no dejar el archivo nuevo huérfano.
                await _imageStorage.DeleteAsync(newImageUrl);
                throw;
            }

            await _imageStorage.DeleteAsync(previousImageUrl);

            return Ok(new { message = "Imagen actualizada correctamente.", imageUrl = product.ImageUrl });
        }

        // DELETE: api/Products/5/image
        [HttpDelete("{id:int}/image")]
        [Authorize(Roles = Roles.Admin)] // SEC-01
        public async Task<IActionResult> DeleteProductImage(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound(new { message = "Producto no encontrado." });

            var previousImageUrl = product.ImageUrl;
            product.ImageUrl = null;
            product.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            await _imageStorage.DeleteAsync(previousImageUrl);

            return Ok(new { message = "Imagen eliminada.", imageUrl = (string?)null });
        }

        private static readonly Dictionary<string, string> ImageContentTypes = new()
        {
            [".jpg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp"
        };

        private static string? DetectImageExtension(byte[] header)
        {
            if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF) return ".jpg";
            if (header.Length >= 8 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47
                && header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A) return ".png";
            if (header.Length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') return ".webp";
            return null;
        }

        private IQueryable<object> ProjectProducts(IQueryable<Product> query, int? sectionId)
        {
            return query
                .OrderBy(product => product.Name)
                .Select(product => new
                {
                    product.ProductId,
                    product.Sku,
                    product.Barcode,
                    product.Name,
                    product.Description,
                    product.PurchasePrice,
                    product.SalePrice,
                    product.IsActive,
                    product.IsService,
                    product.IsOpenItem,
                    product.EmployeeCommissionPercentage,
                    product.BusinessProfitPercentage,
                    product.ImageUrl,
                    product.CategoryId,
                    CategorySectionId = product.Category == null ? (int?)null : product.Category.SectionId,
                    Category = product.Category == null ? null : new { product.Category.CategoryId, product.Category.Name },
                    product.TaxId,
                    Tax = product.Tax == null ? null : new { product.Tax.TaxId, product.Tax.Name, product.Tax.Percentage },
                    Sections = product.Inventories
                        .Where(inventory => !sectionId.HasValue || inventory.SectionId == sectionId.Value)
                        .Select(inventory => new { inventory.InventoryId, inventory.SectionId, inventory.Section.Name, inventory.CurrentStock, inventory.MinStock })
                        .ToList()
                });
        }

        private static string? ValidatePercentages(decimal employeeCommissionPercentage, decimal businessProfitPercentage)
        {
            if (employeeCommissionPercentage < 0 || employeeCommissionPercentage > 100)
                return "El porcentaje de comisión del empleado debe estar entre 0 y 100.";
            if (businessProfitPercentage < 0 || businessProfitPercentage > 100)
                return "El porcentaje de ganancia local debe estar entre 0 y 100.";
            if (Math.Round(employeeCommissionPercentage + businessProfitPercentage, 2) != 100m)
                return "La suma del % de comisión del empleado y el % de ganancia local debe ser 100.";
            return null;
        }

        private async Task<string?> ValidateProduct(string name, string sku, string? barcode, int categoryId, int taxId, decimal purchasePrice, decimal salePrice, int? sectionId, int? initialStock, int? minStock)
        {
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(sku)) return "Nombre y SKU son obligatorios.";
            if (categoryId <= 0 || !await _context.Categories.AnyAsync(category => category.CategoryId == categoryId && (!sectionId.HasValue || category.SectionId == sectionId.Value))) return "La categoría no existe en la unidad de negocio seleccionada.";
            if (taxId <= 0 || !await _context.Taxes.AnyAsync(tax => tax.TaxId == taxId)) return "El impuesto seleccionado no existe.";
            if (sectionId.HasValue && (sectionId.Value <= 0 || !await _context.Sections.AnyAsync(section => section.SectionId == sectionId.Value))) return "La unidad de negocio seleccionada no existe.";
            if (purchasePrice < 0 || salePrice < 0) return "Los precios no pueden ser negativos.";
            if (initialStock.HasValue && initialStock.Value < 0 || minStock.HasValue && minStock.Value < 0) return "El stock inicial y mínimo no pueden ser negativos.";
            return null;
        }

    }
}