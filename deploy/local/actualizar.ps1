#Requires -RunAsAdministrator
# Instala una version nueva de AppPOS en el portatil sin tocar la configuracion ni los datos.
# Uso (PowerShell como administrador):
#   Set-ExecutionPolicy -Scope Process Bypass
#   C:\AppPOS\scripts\actualizar.ps1 -Paquete "C:\Users\<tu usuario>\Downloads\AppPOS-20261108-1530.zip"
param(
    [Parameter(Mandatory = $true)][string]$Paquete,
    [string]$Raiz = 'C:\AppPOS',
    [string]$Servicio = 'AppPOS',
    [int]$Puerto = 5000
)

$ErrorActionPreference = 'Stop'
function Paso([string]$texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

$appDir = Join-Path $Raiz 'app'
$temporal = Join-Path $env:TEMP ('AppPOS-actualizacion-' + (Get-Date -Format 'yyyyMMddHHmmss'))

Paso 'Respaldo antes de actualizar'
& (Join-Path $Raiz 'scripts\backup.ps1') -Raiz $Raiz
if ($LASTEXITCODE) { throw 'El respaldo fallo: no se actualiza sin respaldo. Revisa C:\AppPOS\backups\backup.log' }

Paso 'Descomprimiendo el paquete'
Expand-Archive -Path $Paquete -DestinationPath $temporal
if (-not (Test-Path (Join-Path $temporal 'app\AppPOS.Api.exe'))) { throw 'El paquete no tiene app\AppPOS.Api.exe: genera uno con publicar.ps1.' }

try {
    Paso 'Deteniendo el servicio'
    Stop-Service $Servicio

    Paso 'Copiando la version nueva'
    # /MIR deja app\ igual al paquete, pero conserva appsettings.json (configuracion y secretos).
    robocopy (Join-Path $temporal 'app') $appDir /MIR /XF appsettings.json /XD (Join-Path $appDir 'wwwroot\uploads') /NFL /NDL /NJH /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy fallo (codigo $LASTEXITCODE)." }
    Copy-Item (Join-Path $temporal 'scripts\*') (Join-Path $Raiz 'scripts') -Force
}
finally {
    Paso 'Iniciando el servicio (aplica las migraciones de base de datos pendientes)'
    Start-Service $Servicio
    Remove-Item $temporal -Recurse -Force -ErrorAction SilentlyContinue
}

$url = "http://localhost:$Puerto/"
for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 5 | Out-Null; Write-Host "`nActualizado. La app responde en $url" -ForegroundColor Green; exit 0 } catch { Start-Sleep 2 }
}
throw "La app no responde en $url. Revisa el Visor de eventos (Registros de Windows > Aplicacion). Para volver atras: restaurar.ps1 con el respaldo recien creado y el paquete anterior."
