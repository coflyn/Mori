<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>
<p align="center"><em>随处保存，想下就下。</em></p>
<p align="center"><a href="README.md">English</a> · <strong>简体中文</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.6.0-brown?style=flat-square" alt="Version">
  <a href="https://www.npmjs.com/package/@coflyn/mori"><img src="https://img.shields.io/npm/v/@coflyn/mori?style=flat-square&color=CB3837&logo=npm&logoColor=white" alt="NPM Version"></a>
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20CLI-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
  <a href="https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A"><img src="https://img.shields.io/badge/WhatsApp-Channel-25D366?style=flat-square&logo=whatsapp&logoColor=white" alt="WhatsApp Channel"></a>
</p>

<div align="center">

从 16 个平台保存视频、图片和音频，并自带媒体工具。无水印、无需账号、无追踪。全部在你的设备本地运行。

<a href="https://sociabuzz.com/coflyn/tribe" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" />
</a>

</div>

## 截图

<p align="center">
  <img src="assets/1.webp" width="30%">
  <img src="assets/2.webp" width="30%">
  <img src="assets/3.webp" width="30%">
</p>
<p align="center">
  <img src="assets/4.webp" width="30%">
  <img src="assets/5.webp" width="30%">
  <img src="assets/6.webp" width="30%">
</p>

---

## 目录

1. [怎么用](#怎么用)
2. [下载与安装](#下载与安装)
3. [Mori CLI（终端）](#mori-cli终端)
4. [功能](#功能)
5. [内置工具](#内置工具)
6. [支持的平台与解析引擎](#支持的平台与解析引擎)
7. [开发者与源码构建](#开发者与源码构建)
8. [解析器架构](#解析器架构)
9. [免责声明](#免责声明)
10. [许可证](#许可证)

---

## 怎么用

三步保存媒体：

1. 从任意支持的应用复制视频、图片或音乐链接。
2. 打开 Mori。应用会自动读取剪贴板。在 Android 上，也可以在帖子里点分享，然后选择 Mori。
3. 选择清晰度或格式，点下载。文件会直接保存到相册或音乐文件夹。

## 下载与安装

预编译包发布在 [GitHub Releases](https://github.com/coflyn/Mori/releases) 和 [npm](https://www.npmjs.com/package/@coflyn/mori)。

| 平台 | 安装包 | 说明 |
| :--- | :--- | :--- |
| <img src="https://cdn.simpleicons.org/android/3DDC84" width="16" /> Android | `Mori v...apk` | [安装与 Play 保护排查](GUIDE.zh-CN.md#android) |
| <img src="https://cdn.simpleicons.org/apple/000000" width="16" /> iOS | `Mori v...ipa` | [AltStore / TrollStore 侧载](GUIDE.zh-CN.md#ios) |
| <img src="https://cdn.simpleicons.org/npm/CB3837" width="16" /> CLI（桌面与服务器） | `npx @coflyn/mori`<br>`npm install -g @coflyn/mori` | [Mori CLI](#mori-cli终端) |

安装步骤和排查见 [使用指南（GUIDE.zh-CN.md）](GUIDE.zh-CN.md)。

独立桌面图形界面已改为 Mori CLI（`@coflyn/mori`），可直接在终端使用，更新时也不再弹出系统安全提示。

---

## Mori CLI（终端）

Mori 也可以直接在终端里运行：

<p align="center">
  <img src="assets/cli.webp" width="85%" alt="Mori CLI Preview">
</p>

```bash
# 不安装，直接运行
npx @coflyn/mori

# 直接下载某个链接
npx @coflyn/mori <URL>

# 只下载音频（MP3）
npx @coflyn/mori <URL> -a

# 把相册直接合成 PDF
npx @coflyn/mori <URL> -p
```

或全局安装：

```bash
npm install -g @coflyn/mori
mori
```

CLI 功能：

- 交互式终端提示，方向键导航，以及斜杠命令（`/history`、`/play <num>`、`/delete <num>`、`/config`、`/stats`、`/update`、`/clear`）。
- 启动时自动检查版本，npm 上有新版本时会提示。
- 相册和图集支持并发下载，并在原地显示进度条。
- 在 CLI 内更新：`mori --update` 或 `/update`。
- 完整命令和参数见 [CLI 文档（cli/README.md）](cli/README.md)。

## 功能

- 从 16 个平台下载无水印视频、图片和音频（TikTok、Instagram、YouTube、Twitter/X、Spotify、Apple Music、Pinterest、Facebook、Threads、Bandcamp、Pixiv、Bilibili、抖音、小红书、Reddit、TeraBox）。
- 粘贴夸克、UC、百度、迅雷、115、123、蓝奏、阿里云盘等中文分享文案时，会抽出链接并保留提取码。这些网盘暂时还不能直接下载。
- 内置媒体工具：浏览器流嗅探、离线音频提取、图片转换、PDF 压缩、用户名可用性检查、动画场景搜索。
- 应用内通过 GitHub Releases 直接更新 APK，更新日志随界面语言显示。
- 自定义文件名模板，可用 `{platform}`、`{date}`、`{time}`、`{quality}`、`{num}`、`{title}`，每个平台单独记住连续编号。
- 实时下载进度：字节计数、传输速度、卡住检测、存储写入状态。
- 自动写入 MediaStore，新文件会立刻出现在系统相册和音乐应用里。
- 自定义下载目录，包括外置 SD 卡。
- 支持 Spotify、Apple Music、YouTube 的整张专辑和播放列表。
- 相册和图集最多 5 路并行下载。
- 悬浮下载气泡：总进度环、任务抽屉、取消控制。
- Android 分享菜单集成，不用打开主界面也能下载。
- 批量下载，一次排队多个链接。
- 内置播放器：时间轴拖动、双击快进、音频控制。
- 本地媒体库，可浏览和筛选已保存的视频、音乐、图片和 PDF。
- 图片轮播可导出为 PDF，方便离线阅读。
- 可选 PIN 和生物识别锁，保护历史记录和设置。
- 后台下载，并支持保持唤醒。
- 9 种语言（英语、印尼语、日语、韩语、简体中文、带 RTL 的阿拉伯语、俄语、他加禄语、印地语）。
- 全程在设备上运行，无账号、无广告、无追踪。

---

## 内置工具

工具页提供在本机运行的实用功能：

| 工具 | 类型 | 说明 |
| :--- | :--- | :--- |
| 媒体嗅探 | 网络嗅探 | 应用内浏览器拦截视频、音频和 HLS（.m3u8）流，并拦截广告与追踪。 |
| 视频转音频 | 离线工具 | 用 Web Audio API 把本地视频（MP4、MKV、WebM、MOV）解成 WAV 或 MP3。 |
| 图片转换与缩放 | 离线工具 | 在 WebP、JPG、PNG 之间转换和缩放，可调质量和分辨率。 |
| PDF 压缩 | 离线工具 | 用内置 pdf-lib 和 pdf.js 在本地压缩 PDF，提供三档压缩。 |
| 用户名检查 | 查询 | 同时检查 20 多个社交平台的用户名是否可用。 |
| 动画场景搜索 | 查询 | 用 trace.moe 反查动画截图，得到作品名、集数和时间点。 |
| TikTok 资料查询 | 查询 | 显示公开资料、统计、粉丝数和头像。 |
| 短链解析 | 链接解析 | 从支持的广告跳转页和短链中解析出目标网址。 |

---

## 支持的平台与解析引擎

| 平台 | 域名 / 格式 | 能力 | 解析引擎 |
| :--- | :--- | :--- | :--- |
| <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> Instagram | `instagram.com`（`/p/`、`/reel/`、`/stories/`） | Reels / Stories / 图片 | InDown（`indown.net`）与 SnapSave（`snapsave.app`） |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> TikTok | `tiktok.com`、`vt.tiktok.com` | 无水印视频 / 图集 | TikDownloader（`tikdownloader.io`）与 TikTokIO（`tiktokio.com`） |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> YouTube | `youtube.com`、`youtu.be`、`music.youtube.com` | 播放列表 / 专辑 / MP4 / MP3 | Ytmp3.gg（`media.ytmp3.gg`）与 Ytmp3.gl（`ytmp3.gl`） |
| <img src="https://cdn.simpleicons.org/x/000000" width="16" /> Twitter (X) | `twitter.com`、`x.com` | 高清视频 / GIF | TwitterVideoDownloader（`twittervideodownloader.com`）与 SaveTWT（`savetwt.com`） |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> Spotify | `open.spotify.com`（`track`、`album`、`playlist`、`/s/`） | 播放列表 / 专辑 / MP3 | SpotiDown（`spotidown.app`）与 SoundLoaders（`spotimate.app`） |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> Apple Music | `music.apple.com` | 专辑 / 播放列表 / MP3 | AplMate（`aplmate.com`） |
| <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> Pinterest | `pinterest.com`、`pin.it` | 视频 / 高清图片 | 直接解析 `pinimg.com` 与 PinDown（`pindown.io`） |
| <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> Facebook | `facebook.com`、`fb.watch` | Reels / 高清视频 | SnapSave（`snapsave.app`） |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> 小红书 | `xiaohongshu.com`、`xhslink.com`、`xhslink.cn`、`rednote.com` | 高清图片 / 视频 | 直接提取 `__INITIAL_STATE__` |
| <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> Threads | `threads.com` | 视频 / 图片轮播 | Threadster（`threadster.app`） |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> 哔哩哔哩 | `bilibili.com`、`b23.tv`、`bili.im`、`bilibili.tv` | 视频 / 音频（DASH 1080p） | Bilibili Web API 与 Wbi |
| <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> Pixiv | `pixiv.net`（`artworks`） | 画廊 / Ugoira 转 MP4 | Pixiv AJAX API 与 Ugoira 压缩包转 MP4 |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> 抖音 | `douyin.com`、`v.douyin.com` | 无水印视频 / 图片 | `iesdouyin.com` API 与页面数据解析 |
| <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> Bandcamp | `*.bandcamp.com` | 单曲 / 专辑 / MP3 | BandcampDownloader（`bandcampdownloader.app`） |
| <img src="https://cdn.simpleicons.org/reddit/FF4500" width="16" /> Reddit | `reddit.com`、`redd.it` | 带声音的高清视频 / 图片 | RapidSave（`rapidsave.com`） |
| <img src="https://cdn.simpleicons.org/box/0061D5" width="16" /> TeraBox | `terabox.com`、`teraboxapp.com`、`1024tera.com`、`teraboxlink` | 直链 / 流（m3u8） | Sechno（`sechno.com`） |

---

## 开发者与源码构建

搭建开发环境、补充翻译或本地构建：

- 构建要求和 Android、iOS 编译说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 版本记录见 [CHANGELOG.md](CHANGELOG.md)。
- 英文目录树和技术栈见 [README.md](README.md) 的 Tech Stack & Project Structure。

界面文案在 `public/js/i18n/locales/`。简体中文是 `zh.js`。缺键时自动回退到英文。

---

## 解析器架构

解析器用 esbuild 打成 IIFE，输出到 `public/js/scrapers/bundle.js`，包含全部 16 个平台引擎。

- 打包后的解析器随 GitHub Releases 的常规更新一起发布。
- 界面、桥接层和解析器封装以 GPL-3.0 开源。
- 平台解析修复可按 [CONTRIBUTING.md](CONTRIBUTING.md) 提交。

---

## 免责声明

- 仅供个人和学习使用。Mori 用于个人媒体存档和研究。使用者须自行遵守当地版权法和各平台服务条款。
- 不托管媒体。Mori 不在外部服务器上托管、缓存或再分发媒体文件。下载都在用户设备上直接完成。
- 上游服务。Mori 会请求公开网页接口。如果你运营上游服务并希望移除某个接口，请开 GitHub Issue，或联系 riazrepo@gmail.com。

---

## 许可证

Mori 使用 [GNU 通用公共许可证 v3.0（GPL-3.0）](LICENSE)。

- 修改或再分发本软件时，必须以 GPL-3.0 公开完整对应源代码。
- 未经遵守 GPL-3.0，不得商业再分发、换皮，或分发闭源构建。
- Mori 名称和项目标志归原作者所有。衍生项目必须使用不同的品牌。

---

由 coflyn 开发。  
WhatsApp 频道：https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub：https://github.com/coflyn  
Instagram：@\_coflyn
