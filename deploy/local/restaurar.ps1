#Requires -RunAsAdministrator
# Restaura un respaldo de AppPOS (REEMPLAZA la base de datos y las imagenes actuales).
# Acepta el .zip que genera backup.ps1 o un .bak suelto (p. ej. el de la base de desarrollo).
# Uso (PowerShell como administrador):
#   Set-ExecutionPolicy -Scope Process Bypass
#   C:\AppPOS\scripts\restaurar.ps1 -Respaldo "C:\AppPOS\backups\AppPOS-20261108-190000.zip"
param(
    [Parameter(Mandatory = $true)][string]$Respaldo,
    [string]$Raiz = 'C:\AppPOS',
    [string]$Instancia = 'localhost\SQLEXPRESS',
    [string]$BaseDatos = 'AppPOS_DB',
    [string]$UsuarioSql = 'apppos',
    [string]$Servicio = 'AppPOS',
    [switch]$SinImagenes
)

$ErrorActionPreference = 'Stop'
function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

function Conexion([string]$base = 'master') {
    $c = New-Object System.Data.SqlClient.SqlConnection "Server=$Instancia;Database=$base;Integrated Security=True;TrustServerCertificate=True"
    $c.Open()
    return $c
}

if (-not (Test-Path $Respaldo)) { throw "No existe $Respaldo" }

Write-Warning "Esto REEMPLAZA la base '$BaseDatos' (y las imagenes) por el contenido de $Respaldo."
if ((Read-Host 'Escribe SI para continuar') -cne 'SI') { Write-Host 'Cancelado.'; exit 1 }

# Se trabaja dentro de backups\ porque ahi el servicio de SQL Server tiene permiso de lectura.
$trabajo = Join-Path $Raiz ('backups\restaurar-' + (Get-Date -Format 'yyyyMMddHHmmss'))
New-Item -ItemType Directory -Force $trabajo | Out-Null

try {
    if ($Respaldo -like '*.zip') { Expand-Archive -Path $Respaldo -DestinationPath $trabajo } else { Copy-Item $Respaldo $trabajo }
    $bak = Get-ChildItem $trabajo -Filter '*.bak' | Select-Object -First 1
    if (-not $bak) { throw 'El respaldo no contiene un archivo .bak.' }

    if (Test-Path (Join-Path $Raiz 'app\appsettings.json')) {
        Paso 'Respaldo de seguridad del estado actual'
        & (Join-Path $Raiz 'scripts\backup.ps1') -Raiz $Raiz
        if ($LASTEXITCODE) { Write-Warning 'No se pudo respaldar el estado actual (puede que la base aun no exista). Se continua.' }
    }

    if (Get-Service $Servicio -ErrorAction SilentlyContinue) {
        Paso 'Deteniendo la app'
        Stop-Service $Servicio
    }

    Paso "Restaurando la base '$BaseDatos'"
    $conexion = Conexion
    try {
        $comando = $conexion.CreateCommand()
        $comando.CommandTimeout = 0
        $comando.Parameters.AddWithValue('@ruta', $bak.FullName) | Out-Null

        # Los archivos de datos se ubican en las carpetas por defecto de esta instancia
        # (un .bak de Docker/Linux trae rutas /var/opt/mssql/... que aqui no existen).
        $comando.CommandText = "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(400)), CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS nvarchar(400))"
        $lector = $comando.ExecuteReader(); $lector.Read() | Out-Null
        $rutaDatos = $lector.GetString(0); $rutaLog = $lector.GetString(1); $lector.Close()

        $comando.CommandText = 'RESTORE FILELISTONLY FROM DISK = @ruta'
        $tabla = New-Object System.Data.DataTable
        $tabla.Load($comando.ExecuteReader())

        $movimientos = @()
        $n = 0
        foreach ($fila in $tabla.Rows) {
            $sufijo = if ($n -eq 0) { '' } else { "_$n" }
            if ($fila.Type -eq 'L') { $destino = Join-Path $rutaLog "$BaseDatos$($sufijo)_log.ldf" }
            else { $destino = Join-Path $rutaDatos "$BaseDatos$sufijo.mdf" }
            $movimientos += "MOVE N'$($fila.LogicalName.Replace("'", "''"))' TO N'$($destino.Replace("'", "''"))'"
            $n++
        }

        $comando.CommandText = "IF DB_ID(N'$BaseDatos') IS NOT NULL ALTER DATABASE [$BaseDatos] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; " +
            "RESTORE DATABASE [$BaseDatos] FROM DISK = @ruta WITH REPLACE, " + ($movimientos -join ', ') + "; " +
            "ALTER DATABASE [$BaseDatos] SET MULTI_USER;"
        $comando.ExecuteNonQuery() | Out-Null
    }
    finally {
        $conexion.Dispose()
    }

    # Re-vincula el usuario de la app (el respaldo puede venir de otro servidor).
    $conexion = Conexion $BaseDatos
    try {
        $comando = $conexion.CreateCommand()
        $comando.CommandText = "IF SUSER_ID(N'$UsuarioSql') IS NOT NULL BEGIN " +
            "IF USER_ID(N'$UsuarioSql') IS NULL CREATE USER [$UsuarioSql] FOR LOGIN [$UsuarioSql] ELSE ALTER USER [$UsuarioSql] WITH LOGIN = [$UsuarioSql]; " +
            "ALTER ROLE db_owner ADD MEMBER [$UsuarioSql]; END"
        $comando.ExecuteNonQuery() | Out-Null
    }
    finally {
        $conexion.Dispose()
    }
    Write-Host 'Base restaurada.'

    $origenImagenes = Join-Path $trabajo 'product-images'
    if (-not $SinImagenes -and (Test-Path $origenImagenes)) {
        Paso 'Restaurando imagenes de productos'
        $config = Get-Content (Join-Path $Raiz 'app\appsettings.json') -Raw | ConvertFrom-Json
        $destinoImagenes = $config.Storage.ProductImages.LocalPath
        robocopy $origenImagenes $destinoImagenes /MIR /NFL /NDL /NJH /NP | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "robocopy fallo (codigo $LASTEXITCODE)." }
    }
}
finally {
    if (Get-Service $Servicio -ErrorAction SilentlyContinue) {
        Paso 'Iniciando la app (aplica migraciones pendientes)'
        Start-Service $Servicio
    }
    Remove-Item $trabajo -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`nRestauracion terminada." -ForegroundColor Green
