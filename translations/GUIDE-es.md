# Guía de instalación y uso de Mori

Otros idiomas: [English](../GUIDE.md) · [简体中文](GUIDE-zh-CN.md) · [Bahasa Indonesia](GUIDE-id.md)

Novedades y avisos: [Canal de WhatsApp](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A)

## Descargar versiones

Descarga los binarios desde [GitHub Releases](https://github.com/coflyn/Mori/releases) o instala mediante npm.

| Plataforma | Archivo | Método de instalación |
| :--- | :--- | :--- |
| Android | `Mori v{VERSION}.apk` | Instalación directa |
| iOS | `Mori v{VERSION}.ipa` | Sideload (AltStore, TrollStore, Scarlet) |
| CLI de escritorio | `@coflyn/mori` | `npx @coflyn/mori` o `npm i -g @coflyn/mori` |

## Instalación en Android

### Instalación estándar
1. Descarga `Mori v{VERSION}.apk`.
2. Abre el archivo y presiona Instalar.
3. Otorga los permisos de almacenamiento cuando los solicite.

### Aviso de Play Protect
Mori se distribuye fuera de Google Play Store sin certificados comerciales, por lo que Play Protect puede mostrar un aviso:
1. Presiona Más detalles.
2. Presiona Instalar de todas formas.
3. Puedes analizar el APK en [VirusTotal](https://www.virustotal.com/) antes de instalar.

## CLI de escritorio

Ejecuta Mori desde la terminal:

```bash
# Ejecutar directamente
npx @coflyn/mori

# O instalar de forma global
npm install -g @coflyn/mori
mori
```

Consulta la [documentación de la CLI](../cli/README.md) para ver los comandos y opciones disponibles.

## Sideload en iOS

Instala `Mori v{VERSION}.ipa` con una de estas herramientas:

### AltStore o Sideloadly
Funciona en cualquier versión de iOS sin jailbreak. Requiere una computadora para la configuración inicial.
1. Instala [AltStore](https://altstore.io/) o [Sideloadly](https://sideloadly.io/) en tu computadora.
2. Descarga `Mori v{VERSION}.ipa`.
3. Conecta el iPhone por USB e instala el archivo con tu Apple ID.
4. AltStore renueva las firmas cada 7 días por Wi-Fi.

### TrollStore
Para iOS 14.0 a 16.6.1 e iOS 17.0.
1. Abre el archivo descargado en TrollStore.
2. Presiona Instalar. Queda instalado de forma permanente sin caducidad de 7 días.

### Scarlet o Esign
Instalación directa en el dispositivo mediante certificados de empresa, sin computadora.
1. Abre Scarlet o Esign en el iPhone.
2. Importa `Mori v{VERSION}.ipa` y presiona Firmar e instalar.

## Uso

1. Descarga directa:
   Copia un enlace de cualquier plataforma compatible, abre Mori, presiona Analizar, elige el formato y presiona Descargar.
2. Menú compartir (Android):
   Presiona Compartir en TikTok, Instagram o YouTube y selecciona Mori para guardar sin salir de la app.
3. Descargas por lotes:
   Pega varios enlaces separados por saltos de línea o espacios en el campo de texto.
4. Listas y álbumes:
   Pega el enlace de una lista de Spotify, Apple Music o YouTube y presiona Descargar todo.
5. Exportar imágenes a PDF:
   En publicaciones con varias fotos, selecciona la opción para consolidarlas en un solo documento PDF.
6. Bloqueo de la app:
   Activa un PIN o biometría en Ajustes > General > Bloqueo de aplicación.

## Privacidad

Mori no incluye anuncios, análisis ni rastreadores en segundo plano. Las peticiones de red y el guardado de archivos se ejecutan en tu propio dispositivo. Puedes analizar los archivos descargados en [VirusTotal](https://www.virustotal.com/).

---

Desarrollado por coflyn.  
Canal de WhatsApp: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
