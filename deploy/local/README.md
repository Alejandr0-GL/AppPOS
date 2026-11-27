# Despliegue local de AppPOS (portátil del negocio)

Todo corre en el portátil, como **un solo servicio de Windows** que sirve la API y el frontend en el puerto `5000`, sobre **SQL Server 2022 Express** (gratis). Los respaldos se guardan solos en el portátil y en Google Drive.

```
C:\AppPOS\
├── app\                  API + frontend (se reemplaza en cada actualización)
│   └── appsettings.json  configuración y secretos del portátil (nunca se sobrescribe)
├── data\product-images\  fotos de productos
├── backups\              respaldos .zip + backup.log
└── scripts\              instalar / actualizar / backup / restaurar
```

| Script | Dónde se ejecuta | Para qué |
|---|---|---|
| `publicar.ps1` | PC de desarrollo | Genera `artifacts\AppPOS-<fecha>.zip` |
| `instalar.ps1` | Portátil (admin, una vez) | Configura SQL, la app, el servicio, los respaldos y la energía |
| `actualizar.ps1` | Portátil (admin) | Instala una versión nueva sin tocar datos ni configuración |
| `backup.ps1` | Portátil (automático) | Respalda la base de datos y las imágenes |
| `restaurar.ps1` | Portátil (admin) | Restaura un respaldo |

---

## Parte A — En tu PC de desarrollo

### A1. Datos del negocio para el recibo
Completa `name`, `nit`, `address`, `phone` y `email` en
`frontend/app-pos-client/src/environments/environment.prod.ts`.
**No hagas commit de ese cambio**, porque son datos reales del negocio. Déjalo solo en tu copia local.

### A2. Generar el paquete
En PowerShell, desde la raíz del repositorio:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\local\publicar.ps1
```

Resultado: `artifacts\AppPOS-AAAAMMDD-HHMM.zip`. Cópialo al portátil con una USB o con Google Drive.

> El paquete **no** lleva tu `appsettings.json` de desarrollo ni las imágenes de prueba.

### A3. (Opcional) Llevar los datos que ya cargaste en desarrollo
Hazlo solo si quieres conservar los productos y categorías que ya cargaste. Ojo: también se llevan las ventas y los usuarios de prueba. Con Docker Desktop encendido:

```powershell
docker start pos_db
docker exec pos_db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<DB_PASSWORD del .env>" -C -Q "BACKUP DATABASE [AppPOS_DB] TO DISK = N'/var/opt/mssql/AppPOS_DB.bak' WITH INIT"
docker cp pos_db:/var/opt/mssql/AppPOS_DB.bak .
```

Lleva `AppPOS_DB.bak` y la carpeta `backend\AppPOS.Api\wwwroot\uploads\products` al portátil (pasos B6 y B7).

---

## Parte B — En el portátil (una sola vez)

### B1. Windows recién formateado
1. Ejecuta Windows Update hasta que no queden actualizaciones pendientes.
2. **Configuración → Hora e idioma**: zona horaria **(UTC-05:00) Bogotá**. Las ventas se guardan con la hora del equipo.
3. **Configuración → Sistema → Información → Cambiar el nombre de este equipo**: ponle un nombre como `POS-CAJA`. Con Tailscale, la dirección de la app dependerá de este nombre.
4. **Windows Update → Opciones avanzadas → Horas activas**: pon el horario del local para que no se reinicie en plena venta.
5. En **Dell Power Manager** (o en la BIOS): batería en **"Uso principal de CA"**, que limita la carga a ~80% y la cuida estando siempre enchufado.

### B2. Instalar SQL Server 2022 Express
1. Descárgalo de <https://www.microsoft.com/es-es/sql-server/sql-server-downloads> (edición **Express**).
2. Elige el tipo de instalación **Básica** y acepta los valores por defecto.
3. Al terminar, cierra el instalador. No hace falta SSMS.

> `instalar.ps1` activa luego la autenticación mixta, limita la RAM de SQL Server a 2 GB y crea la base de datos y el usuario de la app.

### B3. Google Drive para escritorio
1. Instálalo desde <https://www.google.com/drive/download/> e inicia sesión con la cuenta del negocio.
2. Revisa la letra de unidad en el Explorador; normalmente es `G:\Mi unidad`.

Los respaldos se copiarán a `G:\Mi unidad\AppPOS-Respaldos`. OneDrive también sirve; usa su carpeta.

### B4. Descomprimir el paquete
Descomprime `AppPOS-AAAAMMDD-HHMM.zip` en `C:\AppPOS`. Deben quedar `C:\AppPOS\app` y `C:\AppPOS\scripts`.

### B5. Ejecutar el instalador
Abre **PowerShell como administrador** (clic derecho en Inicio → Terminal (administrador)):

```powershell
Set-ExecutionPolicy -Scope Process Bypass
C:\AppPOS\scripts\instalar.ps1 -CarpetaNube "G:\Mi unidad\AppPOS-Respaldos"
```

El script:
- instala el runtime de ASP.NET Core 9 si falta;
- configura SQL Server y crea la base de datos `AppPOS_DB` con el usuario `apppos` y una contraseña aleatoria;
- **te pide la contraseña inicial del usuario `admin`** de la app;
- genera `C:\AppPOS\app\appsettings.json` con las claves;
- crea el servicio `AppPOS`, que arranca solo con Windows y se reinicia si falla;
- programa el respaldo automático a las 13:00 y a las 19:00 (si el portátil estaba apagado, se hace al encenderlo);
- configura la energía: enchufado no se suspende y cerrar la tapa no hace nada;
- crea el acceso directo **AppPOS** en el escritorio.

> 🔐 **Guarda una copia de `C:\AppPOS\app\appsettings.json`** en un lugar seguro, como un gestor de contraseñas o una carpeta privada. Tiene la contraseña de la base de datos y la clave JWT.

### B6. Primer ingreso
1. Abre el acceso directo **AppPOS** (`http://localhost:5000`) en Chrome o Edge.
2. Entra con `admin` y la contraseña que escribiste.
3. Crea los usuarios cajeros desde la pantalla **Usuarios**.
4. Copia las fotos de productos, si las tienes del paso A3, a `C:\AppPOS\data\product-images`.

> La impresora térmica (WebUSB) funciona porque la caja entra por `localhost`. Usa siempre el acceso directo, no la IP del equipo.

### B7. (Opcional) Cargar la base de desarrollo
Si hiciste el paso A3:

```powershell
C:\AppPOS\scripts\restaurar.ps1 -Respaldo "C:\ruta\AppPOS_DB.bak"
```

Al iniciar, la app aplica sola las migraciones que falten. Ojo: los usuarios y contraseñas serán los de desarrollo.

### B8. Probar el respaldo (¡no te lo saltes!)
```powershell
powershell -ExecutionPolicy Bypass -File C:\AppPOS\scripts\backup.ps1 -CarpetaNube "G:\Mi unidad\AppPOS-Respaldos"
```
Verifica que aparezca un `AppPOS-*.zip` en `C:\AppPOS\backups` y en Google Drive. El historial queda en `C:\AppPOS\backups\backup.log`.

Un respaldo que nunca se probó restaurar no es un respaldo. Al menos una vez, registra una venta de prueba, restaura el zip de antes con `restaurar.ps1` y comprueba que la venta desaparece.

---

## Parte C — Celulares (cuando lo necesites): Tailscale

Con Tailscale, los celulares entran por **HTTPS**, desde el local o desde fuera, sin abrir puertos en el router. Solo funciona mientras el portátil esté encendido.

1. En el portátil, instala Tailscale (<https://tailscale.com/download/windows>) e inicia sesión con la cuenta del negocio.
2. En <https://login.tailscale.com/admin/dns> activa **MagicDNS** y **HTTPS Certificates**.
3. En PowerShell como administrador:
   ```powershell
   tailscale up --unattended
   tailscale serve --bg 5000
   ```
   El comando muestra la dirección, algo como `https://pos-caja.tu-red.ts.net`.
4. En cada celular, instala la app **Tailscale**, inicia sesión con la misma cuenta y abre esa dirección en el navegador.

> Alternativa sin Tailscale, solo dentro del local: ejecuta `instalar.ps1 -AbrirFirewall`, reserva la IP del portátil en el router y entra desde el celular a `http://<IP-del-portátil>:5000`. Al ser HTTP, el celular no podrá usar cámara ni impresión directa.

---

## Parte D — Actualizar a una versión nueva

1. En el PC de desarrollo: `.\deploy\local\publicar.ps1`.
2. Copia el `.zip` al portátil, idealmente fuera del horario de ventas.
3. En PowerShell como administrador:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   C:\AppPOS\scripts\actualizar.ps1 -Paquete "C:\ruta\AppPOS-AAAAMMDD-HHMM.zip"
   ```
   El script hace un respaldo, reemplaza `app\` sin tocar `appsettings.json` ni las fotos, reinicia el servicio y aplica las migraciones.

---

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| La página no abre | `Get-Service AppPOS`. Si está detenido: `Start-Service AppPOS` |
| El servicio no arranca | **Visor de eventos → Registros de Windows → Aplicación**, o ejecuta `C:\AppPOS\app\AppPOS.Api.exe` en una consola para ver el error |
| Error de conexión a la base | `Get-Service 'MSSQL$SQLEXPRESS'` debe estar en ejecución |
| No llegan respaldos a Drive | `C:\AppPOS\backups\backup.log`. Google Drive debe estar abierto con la sesión iniciada |
| Olvidaste la contraseña del admin | Otro admin puede cambiarla en **Usuarios**. Si no hay ninguno, restaura un respaldo o pide ayuda en desarrollo |

## Cuando pases a la nube
Restaura el último `.zip` de respaldo en el servidor nuevo: el `.bak` sirve en SQL Server 2022 sobre Linux o Docker. Copia las fotos y define en variables de entorno los mismos valores de `appsettings.json` (`ConnectionStrings__DefaultConnection`, `Auth__Jwt__Key`, `Storage__ProductImages__LocalPath`, `Database__ApplyMigrationsOnStartup=true`…).
