# Mori 安装与使用指南

English: [GUIDE.md](GUIDE.md)

这份指南说明如何在 Android、iOS 和桌面（CLI）上安装 Mori、侧载、排查问题，以及日常怎么用。

> 官方社区与更新：加入 [WhatsApp 频道](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A)，获取发布公告和讨论。

---

## 下载官方版本

请只从 **[GitHub Releases](https://github.com/coflyn/Mori/releases)** 下载官方安装包，或通过 **npm** 安装。

| 平台 | 推荐文件 | 安装方式 |
| :--- | :--- | :--- |
| **Android** | `Mori v{VERSION}.apk` | 直接安装 |
| **iOS** | `Mori v{VERSION}.ipa` | 侧载（AltStore / TrollStore / Scarlet） |
| **CLI（桌面与服务器）** | `@coflyn/mori` | `npx @coflyn/mori` / `npm i -g @coflyn/mori` |

---

## Android 安装与排查

<a id="android"></a>

### 常规安装

1. 在手机上下载 `Mori v{VERSION}.apk`。
2. 打开下载好的 APK，点 **安装**。
3. 按提示授予存储权限，Mori 才能把媒体保存到设备上。

### “已被 Play 保护机制阻止”

Mori 是开源应用，不通过 Google Play 商店分发，也没有商业签名。Play 保护机制可能会弹出提示：

1. 点 **详情**。
2. 点 **仍然安装**。
3. 可选：把 `.apk` 上传到 [VirusTotal](https://www.virustotal.com/) 再确认一次。

---

## 桌面（macOS、Windows、Linux）CLI

不需要图形安装包，直接用通用 CLI：

```bash
# 不安装，直接运行
npx @coflyn/mori

# 或全局安装
npm install -g @coflyn/mori
mori
```

完整命令和参数见 [CLI 文档](cli/README.md)。

---

## iOS 侧载

<a id="ios"></a>

Mori 不上架 App Store。可用下面任一工具安装 `Mori v{VERSION}.ipa`。

### 方式 1：AltStore / Sideloadly（各版本 iOS 都适用）

- 适合未越狱的现代 iOS。
- 首次安装需要一台电脑。
- 步骤：
  1. 在电脑上安装 [AltStore](https://altstore.io/) 或 [Sideloadly](https://sideloadly.io/)。
  2. 下载 `Mori v{VERSION}.ipa`。
  3. 用 USB 连接 iPhone，用免费 Apple ID 选择 IPA 安装。
  4. 同一 Wi-Fi 下，签名大约每 7 天自动刷新一次。

### 方式 2：TrollStore（永久，不会过期）

- 适合兼容的系统版本（iOS 14.0–16.6.1 / 17.0）。
- 步骤：
  1. 在 TrollStore 里直接打开下载好的 `Mori v{VERSION}.ipa`。
  2. 点 **安装**。安装后永久有效，不需要 7 天刷新，也不需要电脑。

### 方式 3：Scarlet / Esign（手机上直接安装）

- 适合用企业开发者证书、不接电脑直接装。
- 步骤：
  1. 在 iPhone 上打开 Scarlet 或 Esign。
  2. 导入 `Mori v{VERSION}.ipa`，点 **签名并安装**。

---

## 怎么用 Mori

1. **一键下载**
   - 从支持的应用复制视频、图片或音乐链接。
   - 打开 Mori（或点 **粘贴**）。Mori 会自动识别剪贴板里的链接。
   - 点 **解析**，选择格式或清晰度，再点 **下载**。
2. **用分享菜单快速保存（Android）**
   - 在 TikTok、Instagram 或 YouTube 里点 **分享**，选择 **Mori**。
   - Mori 会打开一个快捷层，不用离开当前应用就能下载。
3. **多链接批量**
   - 在输入框里粘贴多个网址，用换行或空格分开。
   - Mori 会自动排队并解析。
4. **下载整个播放列表或专辑**
   - 粘贴 Spotify、Apple Music 或 YouTube 播放列表链接。
   - 点 **全部下载**。曲目会按顺序下载，失败项会自动重试。
5. **图片导出为 PDF**
   - 打开多图帖子（Instagram、TikTok 图集、小红书）时，选择 **合并为单个 PDF**，整组图片会合成一个 PDF。
6. **隐私 PIN 与生物识别锁**
   - 打开 **设置** → **通用** → **应用锁**。
   - 设置 4 位 PIN，或启用指纹 / 面容，避免别人看到下载记录。

界面语言：系统语言是中文时，首次打开会使用简体中文。也可以在 **设置 → 通用 → 语言** 里手动切换。

---

## 安全与隐私

Mori **没有广告、开源，也不含追踪或遥测**。

- 解析、网络请求和文件保存都 **直接在你的设备上** 完成。
- 不会把数据发给外部服务器或第三方。
- 安装前可以把安装包上传到 [VirusTotal](https://www.virustotal.com/) 扫描。

---

由 coflyn 开发。  
WhatsApp 频道：https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub：https://github.com/coflyn  
Instagram：@\_coflyn
