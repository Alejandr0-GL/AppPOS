#Requires -RunAsAdministrator
# Instalacion de AppPOS en el portatil del negocio (una sola vez; se puede repetir sin romper nada).
# Requisitos: SQL Server 2022 Express instalado y el paquete descomprimido en C:\AppPOS.
# Uso (PowerShell como administrador):
#   Set-ExecutionPolicy -Scope Process Bypass
#   C:\AppPOS\scripts\instalar.ps1 -CarpetaNube "G:\Mi unidad\AppPOS-Respaldos"
param(
    [string]$Raiz = 'C:\AppPOS',
    [string]$CarpetaNube = '',
    [string]$Instancia = 'localhost\SQLEXPRESS',
    [string]$ServicioSql = 'MSSQL$SQLEXPRESS',
    [string]$BaseDatos = 'AppPOS_DB',
    [string]$UsuarioSql = 'apppos',
    [string]$Servicio = 'AppPOS',
    [int]$Puerto = 5000,
    [int]$MemoriaSqlMB = 2048,
    # Abre el puerto en el firewall (red privada) para entrar desde celulares por la IP del WiFi.
    # No hace falta con Tailscale.
    [switch]$AbrirFirewall,
    [switch]$SinAjustesEnergia
)

$ErrorActionPreference = 'Stop'

function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

function Sql([string]$consulta, [string]$base = 'master') {
    $conexion = New-Object System.Data.SqlClient.SqlConnection "Server=$Instancia;Database=$base;Integrated Security=True;TrustServerCertificate=True"
    $conexion.Open()
    try {
        $comando = $conexion.CreateCommand()
        $comando.CommandText = $consulta
        $comando.CommandTimeout = 300
        return $comando.ExecuteScalar()
    }
    finally {
        $conexion.Dispose()
    }
}

function SecretoAleatorio([int]$bytes) {
    $buffer = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return [Convert]::ToBase64String($buffer)
}

function EsperarSql {
    for ($i = 0; $i -lt 30; $i++) {
        try { Sql 'SELECT 1' | Out-Null; return } catch { Start-Sleep 2 }
    }
    throw "SQL Server no responde en $Instancia."
}

$appDir = Join-Path $Raiz 'app'
$exe = Join-Path $appDir 'AppPOS.Api.exe'
$appSettings = Join-Path $appDir 'appsettings.json'
$imagenes = Join-Path $Raiz 'data\product-images'
$backups = Join-Path $Raiz 'backups'

if (-not (Test-Path $exe)) {
    throw "No se encontro $exe. Descomprime el paquete AppPOS-*.zip en $Raiz (deben quedar las carpetas app y scripts)."
}

# ---------------------------------------------------------------------------
Paso 'Runtime de ASP.NET Core 9'
if (Test-Path 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\9.*') {
    Write-Host 'Ya instalado.'
}
else {
    winget install --id Microsoft.DotNet.AspNetCore.9 -e --silent --accept-source-agreements --accept-package-agreements
    if (-not (Test-Path 'C:\Program Files\dotnet\shared\Microsoft.AspNetCore.App\9.*')) {
        throw 'No se pudo instalar. Descarga "ASP.NET Core Runtime 9 (x64)" de https://dotnet.microsoft.com/download/dotnet/9.0 y vuelve a ejecutar este script.'
    }
}

# ---------------------------------------------------------------------------
Paso "SQL Server ($Instancia)"
if (-not (Get-Service $ServicioSql -ErrorAction SilentlyContinue)) {
    throw "No existe el servicio $ServicioSql. Instala SQL Server 2022 Express (instalacion Basica) y vuelve a ejecutar."
}
EsperarSql

# Autenticacion mixta (Windows + usuario SQL): la app entra con un usuario SQL, igual que en la nube.
if ([int](Sql "SELECT CAST(SERVERPROPERTY('IsIntegratedSecurityOnly') AS int)") -eq 1) {
    Write-Host 'Activando autenticacion mixta y reiniciando SQL Server...'
    Sql "EXEC master.dbo.xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'Software\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', REG_DWORD, 2" | Out-Null
    Restart-Service $ServicioSql -Force
    EsperarSql
}

# Con 8 GB de RAM: SQL Server no debe quedarse con toda la memoria.
Sql "EXEC sp_configure 'show advanced options', 1; RECONFIGURE; EXEC sp_configure 'max server memory (MB)', $MemoriaSqlMB; RECONFIGURE;" | Out-Null
Write-Host "Memoria maxima de SQL Server: $MemoriaSqlMB MB"

Sql "IF DB_ID(N'$BaseDatos') IS NULL CREATE DATABASE [$BaseDatos]" | Out-Null
Write-Host "Base de datos $BaseDatos lista."

# ---------------------------------------------------------------------------
Paso 'Carpetas de datos y respaldos'
New-Item -ItemType Directory -Force $imagenes, $backups | Out-Null
# El servicio de SQL Server escribe los .bak en backups\
icacls $backups /grant "NT SERVICE\$($ServicioSql):(OI)(CI)M" | Out-Null
Write-Host "Imagenes: $imagenes"
Write-Host "Respaldos: $backups"

# ---------------------------------------------------------------------------
Paso 'Configuracion (appsettings.json)'
if (Test-Path $appSettings) {
    Write-Host 'Ya existe: se conserva (no se cambian contrasenas ni claves).'
}
else {
    $passwordSql = (SecretoAleatorio 24) -replace '[+/=]', ''
    $passwordSql = "$passwordSql#Aa1"
    Sql "IF SUSER_ID(N'$UsuarioSql') IS NULL CREATE LOGIN [$UsuarioSql] WITH PASSWORD = N'$passwordSql', DEFAULT_DATABASE = [$BaseDatos] ELSE ALTER LOGIN [$UsuarioSql] WITH PASSWORD = N'$passwordSql'" | Out-Null
    Sql "IF USER_ID(N'$UsuarioSql') IS NULL CREATE USER [$UsuarioSql] FOR LOGIN [$UsuarioSql]; ALTER ROLE db_owner ADD MEMBER [$UsuarioSql];" $BaseDatos | Out-Null

    $cadena = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    $cadena['Data Source'] = $Instancia
    $cadena['Initial Catalog'] = $BaseDatos
    $cadena['User ID'] = $UsuarioSql
    $cadena['Password'] = $passwordSql
    $cadena['TrustServerCertificate'] = $true

    do {
        $passwordAdmin = Read-Host 'Contrasena inicial para el usuario "admin" de la app (minimo 8 caracteres)'
    } while ($passwordAdmin.Length -lt 8)

    $config = [ordered]@{
        Urls              = "http://*:$Puerto"
        ConnectionStrings = [ordered]@{ DefaultConnection = $cadena.ConnectionString }
        Database          = [ordered]@{ ApplyMigrationsOnStartup = $true }
        Auth              = [ordered]@{
            Jwt                    = [ordered]@{ Key = (SecretoAleatorio 48); Issuer = 'AppPOS'; Audience = 'AppPOS'; ExpirationHours = 12 }
            BootstrapAdminPassword = $passwordAdmin
            MaxFailedAttempts      = 5
            LockoutMinutes         = 5
        }
        Storage           = [ordered]@{
            ProductImages = [ordered]@{ Provider = 'Local'; LocalPath = $imagenes; RequestPath = '/uploads/products' }
        }
        Logging           = [ordered]@{
            LogLevel = [ordered]@{ Default = 'Information'; 'Microsoft.AspNetCore' = 'Warning'; 'Microsoft.EntityFrameworkCore' = 'Warning' }
        }
        AllowedHosts      = '*'
    }
    [IO.File]::WriteAllText($appSettings, ($config | ConvertTo-Json -Depth 6))
    Write-Host "Creado $appSettings (usuario SQL '$UsuarioSql' con contrasena aleatoria y clave JWT nueva)."
}

# ---------------------------------------------------------------------------
Paso "Servicio de Windows '$Servicio'"
if (-not (Get-Service $Servicio -ErrorAction SilentlyContinue)) {
    New-Service -Name $Servicio -BinaryPathName "`"$exe`"" -DisplayName 'AppPOS' `
        -Description 'Punto de venta AppPOS (API + frontend).' -StartupType Automatic -DependsOn $ServicioSql | Out-Null
    sc.exe config $Servicio start= delayed-auto | Out-Null
    # Si se cae, Windows lo vuelve a levantar.
    sc.exe failure $Servicio reset= 86400 actions= restart/10000/restart/10000/restart/60000 | Out-Null
    Write-Host 'Servicio creado (inicio automatico, se reinicia solo si falla).'
}
Restart-Service $Servicio -Force

$url = "http://localhost:$Puerto/"
$arriba = $false
for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5 | Out-Null; $arriba = $true; break } catch { Start-Sleep 2 }
}
if (-not $arriba) {
    throw "La app no responde en $url. Revisa el Visor de eventos (Registros de Windows > Aplicacion) o ejecuta $exe en una consola para ver el error."
}
Write-Host "La app responde en $url" -ForegroundColor Green

# ---------------------------------------------------------------------------
if ($AbrirFirewall) {
    Paso "Firewall (puerto $Puerto, solo red privada)"
    if (-not (Get-NetFirewallRule -DisplayName 'AppPOS' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName 'AppPOS' -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private | Out-Null
    }
    Write-Host 'Regla creada. Marca la red WiFi del local como "Privada" en Configuracion > Red e Internet.'
}

# ---------------------------------------------------------------------------
Paso 'Respaldo automatico (13:00 y 19:00, o al encender si se omitio)'
$argumentos = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Raiz\scripts\backup.ps1`" -Raiz `"$Raiz`""
if ($CarpetaNube) { $argumentos += " -CarpetaNube `"$CarpetaNube`"" }
$accion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentos
$disparadores = @(
    New-ScheduledTaskTrigger -Daily -At '13:00'
    New-ScheduledTaskTrigger -Daily -At '19:00'
)
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
# Se ejecuta con tu usuario (sesion iniciada) para poder copiar a Google Drive / OneDrive.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'AppPOS - Respaldo' -Action $accion -Trigger $disparadores -Settings $ajustes -Principal $principal -Force | Out-Null
if ($CarpetaNube) { Write-Host "Copia en la nube: $CarpetaNube" } else { Write-Warning 'Sin -CarpetaNube: los respaldos quedan SOLO en este portatil.' }

# ---------------------------------------------------------------------------
if (-not $SinAjustesEnergia) {
    Paso 'Energia (enchufado: no suspender, no hibernar, cerrar la tapa no hace nada)'
    powercfg /change standby-timeout-ac 0
    powercfg /change hibernate-timeout-ac 0
    powercfg /setacvalueindex SCHEME_CURRENT SUB_BUTTONS LIDACTION 0
    powercfg /setactive SCHEME_CURRENT
}

# ---------------------------------------------------------------------------
Paso 'Acceso directo en el escritorio'
Set-Content -Path "$env:PUBLIC\Desktop\AppPOS.url" -Value "[InternetShortcut]`r`nURL=$url"

Write-Host "`nListo. Abre $url e inicia sesion con el usuario 'admin'." -ForegroundColor Green
Write-Host "Guarda una copia de $appSettings en un lugar seguro (tiene la contrasena de la base y la clave JWT)."
