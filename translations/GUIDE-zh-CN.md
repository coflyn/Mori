# Mori 安装与使用指南

其他语言：[English](../GUIDE.md) · [Bahasa Indonesia](GUIDE-id.md) · [Español](GUIDE-es.md)

更新与通知：[WhatsApp 频道](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A)

## 下载版本

从 [GitHub Releases](https://github.com/coflyn/Mori/releases) 下载官方安装包，或通过 npm 安装。

| 平台 | 文件 | 安装方式 |
| :--- | :--- | :--- |
| Android | `Mori v{VERSION}.apk` | 直接安装 |
| iOS | `Mori v{VERSION}.ipa` | 侧载（AltStore、TrollStore、Scarlet） |
| 桌面 CLI | `@coflyn/mori` | `npx @coflyn/mori` 或 `npm i -g @coflyn/mori` |

## Android 安装

### 常规安装
1. 下载 `Mori v{VERSION}.apk`。
2. 打开 APK 并点击安装。
3. 按系统提示授予存储权限。

### Play 保护机制提示
Mori 是开源应用，不通过 Google Play 商店分发，没有商业证书，因此 Play 保护机制可能会提示：
1. 点击“了解详情”。
2. 点击“仍然安装”。
3. 安装前可将 APK 上传至 [VirusTotal](https://www.virustotal.com/) 扫描。

## 桌面 CLI

在终端中直接运行 Mori：

```bash
# 直接运行
npx @coflyn/mori

# 或全局安装
npm install -g @coflyn/mori
mori
```

完整命令见 [CLI 文档](../cli/README.md)。

## iOS 侧载

通过以下任一工具安装 `Mori v{VERSION}.ipa`：

### AltStore 或 Sideloadly
适用于任意现代 iOS 版本（免越狱）。首次安装需要电脑。
1. 在电脑上安装 [AltStore](https://altstore.io/) 或 [Sideloadly](https://sideloadly.io/)。
2. 下载 `Mori v{VERSION}.ipa`。
3. 用 USB 连接手机，使用免费 Apple ID 安装。
4. AltStore 会在同一 Wi-Fi 下每 7 天自动刷新证书。

### TrollStore
适用于兼容系统（iOS 14.0 至 16.6.1，以及 iOS 17.0）。
1. 在 TrollStore 中打开下载好的 IPA。
2. 点击安装。安装后永久有效，无需 7 天续签，也不再需要电脑。

### Scarlet 或 Esign
使用企业证书直接在手机上安装，无需电脑。
1. 在 iPhone 上打开 Scarlet 或 Esign。
2. 导入 `Mori v{VERSION}.ipa` 并点击签名安装。

## 使用方法

1. 单链下载：
   复制支持平台的链接，打开 Mori，点击解析，选择画质或格式后点击下载。
2. 分享菜单（Android）：
   在 TikTok、Instagram 或 YouTube 中点击分享并选择 Mori，无需切出应用即可下载。
3. 批量下载：
   在输入框中粘贴多个链接（用换行或空格分隔）。
4. 播放列表与专辑：
   粘贴 Spotify、Apple Music 或 YouTube 歌单链接后点击全部下载。
5. 图片合并导出 PDF：
   对于多图帖子，可选择合并为单个 PDF 文件导出。
6. 应用锁：
   在设置 > 通用 > 应用锁中设置 4 位 PIN 码或开启生物识别。

## 隐私

Mori 无广告、无分析，也不含任何后台追踪代码。网络请求与文件保存均在本地设备运行。可在 [VirusTotal](https://www.virustotal.com/) 验证安装包安全性。

---

开发者：coflyn  
WhatsApp 频道：https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub：https://github.com/coflyn  
Instagram：@\_coflyn
