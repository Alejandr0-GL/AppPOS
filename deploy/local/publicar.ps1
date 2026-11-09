# Genera el paquete de despliegue local (API + frontend Angular + scripts) en un .zip.
# Se ejecuta en el PC de DESARROLLO:  .\deploy\local\publicar.ps1
# Resultado: artifacts\AppPOS-<fecha>.zip  -> se copia al portatil del negocio.
param(
    [string]$Salida
)

$ErrorActionPreference = 'Stop'

$repo  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$api   = Join-Path $repo 'backend\AppPOS.Api\AppPOS.Api.csproj'
$front = Join-Path $repo 'frontend\app-pos-client'
if (-not $Salida) { $Salida = Join-Path $repo 'artifacts' }

$marca   = Get-Date -Format 'yyyyMMdd-HHmm'
$paquete = Join-Path $Salida "AppPOS-$marca"
$appDir  = Join-Path $paquete 'app'
if (Test-Path $paquete) { Remove-Item $paquete -Recurse -Force }

# Aviso si los datos del negocio para el recibo estan vacios.
$envProd = Get-Content (Join-Path $front 'src\environments\environment.prod.ts') -Raw
if ($envProd -match "name:\s*''") {
    Write-Warning "environment.prod.ts tiene los datos del negocio vacios: el recibo saldra sin encabezado. Completalos antes de publicar (sin hacer commit)."
}

Write-Host "`n==> Publicando la API (.NET)" -ForegroundColor Cyan
dotnet publish $api -c Release -o $appDir --nologo
if ($LASTEXITCODE) { throw 'dotnet publish fallo.' }

# El paquete NO lleva secretos ni datos de desarrollo: el portatil tiene su propio appsettings.json
# (lo crea instalar.ps1) y sus imagenes viven en C:\AppPOS\data.
'appsettings.json', 'appsettings.Development.json', 'appsettings.example.json' |
    ForEach-Object { Remove-Item (Join-Path $appDir $_) -ErrorAction SilentlyContinue }
Remove-Item (Join-Path $appDir 'wwwroot\uploads') -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n==> Compilando el frontend (Angular, produccion)" -ForegroundColor Cyan
Push-Location $front
try {
    if (-not (Test-Path 'node_modules')) {
        npm ci
        if ($LASTEXITCODE) { throw 'npm ci fallo.' }
    }
    npx ng build --configuration production
    if ($LASTEXITCODE) { throw 'ng build fallo.' }
}
finally {
    Pop-Location
}

# La API sirve el frontend desde wwwroot (mismo origen, apiUrl '/api').
Copy-Item (Join-Path $front 'dist\app-pos-client\browser\*') (Join-Path $appDir 'wwwroot') -Recurse -Force

Write-Host "`n==> Copiando scripts de instalacion" -ForegroundColor Cyan
$scripts = Join-Path $paquete 'scripts'
New-Item -ItemType Directory -Force $scripts | Out-Null
Get-ChildItem $PSScriptRoot -Filter '*.ps1' | Where-Object Name -ne 'publicar.ps1' | Copy-Item -Destination $scripts
Copy-Item (Join-Path $PSScriptRoot 'README.md') $scripts

$zip = "$paquete.zip"
Compress-Archive -Path (Join-Path $paquete '*') -DestinationPath $zip -Force
Remove-Item $paquete -Recurse -Force

Write-Host "`nPaquete listo: $zip" -ForegroundColor Green
