# Guía de instalación y uso de Mori

[English](../GUIDE.md) · [简体中文](GUIDE-zh-CN.md) · [Bahasa Indonesia](GUIDE-id.md) · **Español**

Esta guía cubre todo lo necesario para instalar, configurar y aprovechar Mori en Android, iOS y sistemas de escritorio (CLI).

> Comunidad oficial y novedades: Únete al [Canal de WhatsApp](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A) para enterarte de nuevas versiones y avisos del proyecto.

---

## Descarga de versiones oficiales

Descarga siempre los binarios oficiales de Mori directamente desde [GitHub Releases](https://github.com/coflyn/Mori/releases) o mediante [npm](https://www.npmjs.com/package/@coflyn/mori).

| Plataforma | Archivo recomendado | Método de instalación |
| :--- | :--- | :--- |
| **Android** | `Mori v{VERSION}.apk` | Instalación directa del archivo APK |
| **iOS** | `Mori v{VERSION}.ipa` | Instalación externa (AltStore / TrollStore / Scarlet) |
| **CLI (Escritorio y Servidor)** | `@coflyn/mori` | `npx @coflyn/mori` / `npm i -g @coflyn/mori` |

---

## Instalación en Android y solución de problemas

### Instalación estándar
1. Descarga el archivo `Mori v{VERSION}.apk` en tu dispositivo.
2. Abre el archivo descargado y presiona **Instalar**.
3. Concede los permisos de almacenamiento cuando la aplicación lo solicite para poder guardar los archivos en tu galería.

### Aviso "Bloqueado por Play Protect"
Dado que Mori es una aplicación de código abierto distribuida fuera de Google Play Store sin certificados comerciales, Google Play Protect puede mostrar una advertencia:
1. Presiona **"Más detalles"**.
2. Presiona **"Instalar de todas formas"**.
3. *(Opcional)* Si deseas verificar la seguridad del archivo, puedes analizar el paquete `.apk` en [VirusTotal](https://www.virustotal.com/).

---

## Escritorio (macOS, Windows, Linux) mediante CLI

En computadoras puedes usar Mori directamente desde la terminal sin necesidad de instaladores pesados:

```bash
# Ejecutar directamente sin instalar
npx @coflyn/mori

# O instalar de forma global
npm install -g @coflyn/mori
mori
```

Consulta la [documentación de Mori CLI](../cli/README.md) para ver la lista completa de comandos y argumentos disponibles.

---

## Guía de instalación en iOS (Sideloading)

Como Mori no se distribuye en la App Store de Apple, puedes instalar `Mori v{VERSION}.ipa` usando cualquiera de estas herramientas:

### Opción 1: AltStore / Sideloadly (Recomendado para cualquier versión de iOS)
- **Ideal para:** Dispositivos con versiones recientes de iOS sin necesidad de jailbreak.
- **Requisitos:** Una computadora con Windows o Mac para la primera instalación.
- **Pasos:**
  1. Instala [AltStore](https://altstore.io/) o [Sideloadly](https://sideloadly.io/) en tu ordenador.
  2. Descarga `Mori v{VERSION}.ipa`.
  3. Conecta el iPhone por cable USB e instala el archivo IPA utilizando tu Apple ID gratuito.
  4. *Nota:* La firma de la aplicación se renueva automáticamente cada 7 días mientras estés conectado a la misma red Wi-Fi.

### Opción 2: TrollStore (Permanente - Sin caducidad)
- **Ideal para:** Dispositivos con versiones compatibles (iOS 14.0 a 16.6.1 y 17.0).
- **Pasos:**
  1. Abre el archivo `Mori v{VERSION}.ipa` directamente en TrollStore.
  2. Presiona **Install**. La aplicación queda instalada de forma permanente sin límite de 7 días ni necesidad de ordenador.

### Opción 3: Scarlet / Esign (Instalación directa en el dispositivo)
- **Ideal para:** Instalación directa sin ordenador mediante certificados empresariales.
- **Pasos:**
  1. Abre Scarlet o Esign en tu iPhone.
  2. Importa `Mori v{VERSION}.ipa` y presiona **Sign & Install**.

---

## Cómo usar Mori

1. **Descarga en un toque**:
   - Copia el enlace de un vídeo, foto o música de cualquiera de las plataformas compatibles.
   - Abre Mori (o presiona el botón Pegar). La app detectará el enlace del portapapeles.
   - Elige el formato o calidad deseada y presiona **Descargar**.
2. **Guardado rápido desde el menú Compartir (Android)**:
   - En TikTok, Instagram o YouTube, presiona **Compartir** y selecciona **Mori**.
   - Aparecerá un menú superpuesto que te permite descargar sin salir de la app en la que estás.
3. **Descarga múltiple por lotes**:
   - Pega varios enlaces (separados por saltos de línea o espacios) en el campo de texto.
   - Mori los pondrá en cola para analizarlos y descargarlos de forma secuencial.
4. **Descarga de listas de reproducción y álbumes**:
   - Pega un enlace de álbum o lista de Spotify, Apple Music o YouTube.
   - Presiona **Descargar todo** para procesar todas las canciones con reintentos automáticos si falla alguna pista.
5. **Conversión de carruseles de fotos a PDF**:
   - En publicaciones con múltiples imágenes (carruseles de Instagram, diapositivas de TikTok o RedNote), selecciona la opción de exportar a PDF para consolidar todas las fotos en un solo documento.
6. **Bloqueo por PIN y biometría**:
   - Ve a **Ajustes** → **General** → **Bloqueo de aplicación**.
   - Configura un código PIN de 4 dígitos o activa el sensor de huella / Face ID para proteger tu historial y descargas.

---

## Verificación de seguridad y privacidad

Mori es **100% de código abierto, sin publicidad y libre de rastreadores o telemetría**:
- Todo el análisis de enlaces, solicitudes de red y almacenamiento se ejecutan **directamente en tu dispositivo**.
- Ningún dato se envía a servidores intermedios ni a terceros.
- Puedes analizar cualquier archivo de instalación en [VirusTotal](https://www.virustotal.com/) antes de instalarlo.

---

Desarrollado por coflyn.  
Canal de WhatsApp: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
