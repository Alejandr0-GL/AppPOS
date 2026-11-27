# Respaldo de AppPOS: base de datos (.bak) + imagenes de productos en un solo .zip.
# Lo ejecuta la tarea programada "AppPOS - Respaldo" (la crea instalar.ps1), o a mano:
#   powershell -ExecutionPolicy Bypass -File C:\AppPOS\scripts\backup.ps1 -CarpetaNube "G:\Mi unidad\AppPOS-Respaldos"
# Registro de cada ejecucion: C:\AppPOS\backups\backup.log
param(
    [string]$Raiz = 'C:\AppPOS',
    # Carpeta sincronizada con la nube (Google Drive / OneDrive). Vacia = solo copia local.
    [string]$CarpetaNube = '',
    [int]$DiasLocal = 14,
    [int]$DiasNube = 60
)

$ErrorActionPreference = 'Stop'
$carpetaBackups = Join-Path $Raiz 'backups'
$log = Join-Path $carpetaBackups 'backup.log'
New-Item -ItemType Directory -Force $carpetaBackups | Out-Null

function Log([string]$mensaje) {
    $linea = '{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $mensaje
    Write-Host $linea
    Add-Content -Path $log -Value $linea
}

function Limpiar([string]$carpeta, [int]$dias) {
    Get-ChildItem $carpeta -Filter 'AppPOS-*.zip' |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$dias) } |
        Remove-Item -Force
}

$trabajo = $null
try {
    # La conexion se lee del appsettings.json de la app (usuario SQL con permiso de backup).
    $config = Get-Content (Join-Path $Raiz 'app\appsettings.json') -Raw | ConvertFrom-Json
    $cadena = $config.ConnectionStrings.DefaultConnection
    $baseDatos = (New-Object System.Data.SqlClient.SqlConnectionStringBuilder $cadena).InitialCatalog

    $imagenes = $config.Storage.ProductImages.LocalPath
    if (-not $imagenes) { $imagenes = 'wwwroot/uploads/products' }
    if (-not [IO.Path]::IsPathRooted($imagenes)) { $imagenes = Join-Path (Join-Path $Raiz 'app') $imagenes }

    $marca = Get-Date -Format 'yyyyMMdd-HHmmss'
    $trabajo = Join-Path $carpetaBackups "tmp-$marca"
    New-Item -ItemType Directory $trabajo | Out-Null
    $bak = Join-Path $trabajo "$baseDatos.bak"

    # El archivo .bak lo escribe el servicio de SQL Server (instalar.ps1 le da permiso en backups\).
    $conexion = New-Object System.Data.SqlClient.SqlConnection $cadena
    $conexion.Open()
    try {
        $comando = $conexion.CreateCommand()
        $comando.CommandTimeout = 0
        $comando.CommandText = "BACKUP DATABASE [$baseDatos] TO DISK = @ruta WITH INIT, CHECKSUM"
        $comando.Parameters.AddWithValue('@ruta', $bak) | Out-Null
        $comando.ExecuteNonQuery() | Out-Null
    }
    finally {
        $conexion.Dispose()
    }

    if ((Test-Path $imagenes) -and (Get-ChildItem $imagenes -File -ErrorAction SilentlyContinue)) {
        Copy-Item $imagenes (Join-Path $trabajo 'product-images') -Recurse
    }

    $zip = Join-Path $carpetaBackups "AppPOS-$marca.zip"
    Compress-Archive -Path (Join-Path $trabajo '*') -DestinationPath $zip
    Remove-Item $trabajo -Recurse -Force
    $trabajo = $null
    Log ("OK local: {0} ({1:N1} MB)" -f $zip, ((Get-Item $zip).Length / 1MB))
    Limpiar $carpetaBackups $DiasLocal

    if ($CarpetaNube) {
        New-Item -ItemType Directory -Force $CarpetaNube | Out-Null
        Copy-Item $zip $CarpetaNube
        Log "OK nube: $CarpetaNube"
        Limpiar $CarpetaNube $DiasNube
    }
}
catch {
    Log "ERROR: $($_.Exception.Message)"
    if ($trabajo -and (Test-Path $trabajo)) { Remove-Item $trabajo -Recurse -Force -ErrorAction SilentlyContinue }
    exit 1
}
