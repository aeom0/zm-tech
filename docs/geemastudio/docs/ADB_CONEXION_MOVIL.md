# Conexión ADB al Moto G54 — Guía para Claude / Cursor Agent

## Dispositivo

| Campo | Valor |
|---|---|
| Modelo | Motorola Moto G54 |
| Device ID ADB | `ZY22K2LZW3` |
| OS | Android (MediaTek) |
| Entorno de trabajo | WSL2 (Ubuntu) en Windows |

---

## Regla crítica: qué ADB usar

**NUNCA** usar `/home/alber/.local/bin/adb` ni cualquier ADB instalado en WSL/Linux.
Entra en conflicto con el servidor ADB que corre en Windows y la conexión falla.

**SIEMPRE** usar el ADB de Windows desde WSL:

```bash
/mnt/c/Users/alber/AppData/Local/Android/Sdk/platform-tools/adb.exe
```

Para no escribirlo completo cada vez, agregar un alias en la sesión:

```bash
alias adb='/mnt/c/Users/alber/AppData/Local/Android/Sdk/platform-tools/adb.exe'
```

---

## Procedimiento de conexión (cable USB)

1. Conectar el cable USB al teléfono.
2. En las notificaciones del teléfono → tocar **"Cargando por USB"** → seleccionar **"Transferencia de archivos"** (MTP).
3. Verificar que el teléfono está conectado:
   ```bash
   /mnt/c/Users/alber/AppData/Local/Android/Sdk/platform-tools/adb.exe devices
   ```
   Salida esperada:
   ```
   List of devices attached
   ZY22K2LZW3	device
   ```
4. Si aparece `unauthorized` en lugar de `device`:
   - Mirar el teléfono — aparecerá un cuadro "¿Permitir depuración USB?"
   - Tocar **"Permitir siempre desde esta computadora"**
   - Volver a correr `adb devices` — debe mostrar `device`

---

## Comandos de verificación rápida

```bash
# Alias rápido (solo dura la sesión actual)
alias adb='/mnt/c/Users/alber/AppData/Local/Android/Sdk/platform-tools/adb.exe'

# Ver dispositivos conectados
adb devices

# Shell interactivo en el teléfono
adb -s ZY22K2LZW3 shell

# Ver espacio disponible en almacenamiento interno
adb -s ZY22K2LZW3 shell df -h /data/media/0

# Ver archivos en la tarjeta SD virtual del usuario
adb -s ZY22K2LZW3 shell ls /sdcard/

# Copiar archivo DEL teléfono AL PC (Linux filesystem, no /mnt/c/)
adb -s ZY22K2LZW3 pull /sdcard/Pictures/ /home/alber/backup/

# Copiar archivo DEL PC AL teléfono
adb -s ZY22K2LZW3 push /home/alber/archivo.jpg /sdcard/Pictures/
```

---

## Rutas de datos importantes en el teléfono

| Contenido | Ruta en el teléfono |
|---|---|
| Almacenamiento interno general | `/sdcard/` |
| Fotos y capturas | `/sdcard/DCIM/` |
| Descargas | `/sdcard/Download/` |
| WhatsApp principal (media) | `/sdcard/Android/media/com.whatsapp/WhatsApp/Media/` |
| WhatsApp clonado (media) | `/data/media/11/Android/media/com.whatsapp/WhatsApp/Media/` |
| WhatsApp Business (media) | `/sdcard/Android/media/com.whatsapp.w4b/WhatsApp Business/Media/` |
| Música | `/sdcard/Music/` |
| Videos | `/sdcard/Movies/` |

> **Nota:** `/data/media/11/` es el perfil del usuario clonado (Motorola App Clone).
> Necesita `adb shell` con privilegios o `run-as` para acceder.

---

## Regla sobre rutas en adb.exe desde WSL

`adb.exe` es un binario de Windows. Las rutas que entiende son:

- **Rutas del teléfono**: igual que siempre → `/sdcard/Pictures/` ✅
- **Rutas del PC**: deben ser **rutas Windows** cuando el destino es Windows → `C:\backup\`

Si se quiere guardar en el filesystem Linux (recomendado para evitar corrupción NTFS):

```bash
# Guardar en Linux (ext4) — sin problemas de NTFS
adb -s ZY22K2LZW3 pull /sdcard/Pictures/ /home/alber/backup/Pictures/
```

> **Importante:** los archivos en `/mnt/c/` (Windows NTFS montado en WSL) pueden tener problemas
> de permisos con herramientas Linux como exiftool. Siempre trabajar en `/home/alber/` (ext4).

---

## Solución a problemas comunes

### `adb: error: cannot create file/directory`
Estás intentando escribir en una ruta de Windows con slash Linux (`/mnt/c/...`).
**Solución:** usar ruta Linux como destino: `/home/alber/backup/`

### `error: no devices/emulators found`
El teléfono no está detectado.
**Checklist:**
- ¿Está el cable USB conectado?
- ¿Está en modo "Transferencia de archivos" (MTP)?
- ¿El servidor ADB de Windows está corriendo? Abrir una terminal Windows y ejecutar:
  `C:\Users\alber\AppData\Local\Android\Sdk\platform-tools\adb.exe start-server`

### `unauthorized`
Apareció el cuadro en el teléfono pero no se aceptó.
**Solución:** desbloquear el teléfono, aceptar el cuadro, marcar "Permitir siempre".

### `adb: error: failed to copy ... Permission denied`
Estás intentando acceder a datos de app privados (`/data/data/...`).
Esos directorios solo son accesibles con root o con `run-as <package>` en apps debuggeables.

---

## Notas de contexto

- El Moto G54 tiene un **bug de firmware MediaTek** (`mtk_atomic_doze_preparation`) que causa
  reinicios al entrar en doze/AOD. Workaround: deshabilitar AOD y el protector de pantalla.
- El teléfono tiene **3 instancias de WhatsApp**: principal (user 0), clonada (user 11, Motorola App Clone) y Business.
- El backup completo del teléfono está en `/home/alber/backup_moto_g54/` (54,673 archivos, 6.7 GB).
