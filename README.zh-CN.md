# GazeScroll

> **只需将鼠标指针停留在按钮上，即可滚动任何 Windows 应用——无需滚轮，也无需点击。**
>
> 这是一个轻量、始终置顶的 Windows 11 滚动遥控器，尤其适合眼动追踪和其他受限输入环境。

[![平台](https://img.shields.io/badge/Windows-11-0078D4)](#系统要求)
[![许可证](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![界面语言](https://img.shields.io/badge/UI-7%20languages-1f6feb)](#主要功能)

<p align="center">
  <a href="README.md">[English]</a> · <a href="README.ko.md">[한국어]</a> · <strong>[简体中文]</strong> · <a href="README.ja.md">[日本語]</a>
</p>

![GazeScroll 演示——将指针停在按钮上即可滚动下方应用](assets/hero.gif)

---

## GazeScroll 是什么？

GazeScroll 会在屏幕上显示一组小型悬浮控制按钮。只要将鼠标指针在 ▲ 或 ▼ 按钮上停留片刻，正在使用的应用程序就会自动滚动。

它是透明的点击穿透叠加层，可在 Chrome、记事本、终端、KakaoTalk 等众多 Windows 应用上方工作，既不会遮挡应用，也不会夺取焦点。

无需鼠标滚轮，无需物理点击。

## 适合哪些人？

- **难以使用鼠标滚轮、键盘或物理鼠标操作的人**——包括使用眼动输入、凝视鼠标或其他无障碍输入设备的人。只通过移动指针就能滚动或触发按键。
- **工作中经常需要反复滚动的人**——在长时间阅读文档、网页或其他可滚动内容时，可减少重复的滚轮和点击动作。

## 为什么刻意保持简单？

- **无需学习**——看到 ▲ 和 ▼ 按钮就能理解其用途。
- **可见的凝视反馈**——停留时会显示进度指示器，让您知道操作何时会触发。
- **精简的三页设置面板**——只保留真正需要的选项。

GazeScroll 希望提供一种比复杂无障碍工具更轻量、更直接的使用方式。

## 演示

![将指针停在按钮上即可滚动](assets/dwell.gif)

| 外观设置 | 选择要附着的窗口 |
| :--: | :--: |
| ![外观设置](assets/settings.png) | ![附着窗口允许列表](assets/winlist.png) |

## 主要功能

- **悬停滚动**——将指针停留在按钮上达到可配置的时间即可滚动，无需物理点击。
- **点击模式**——适合希望立即触发操作的用户。
- **附着到窗口**——按钮组会跟随目标窗口的移动和缩放；可选择八个锚点位置之一。
- **窗口允许列表**——仅附着到选定的应用，也可以清空列表以允许所有窗口。
- **自定义外观**——可设置按钮大小、圆形/圆角/方形、四种凝视指示器、七套配色、边框和透明度。
- **七种界面语言**——支持韩语、英语、日语、简体中文、繁体中文、印地语和西班牙语。
- **不打扰当前工作**——驻留系统托盘、始终置顶，但不会夺取正在使用应用的焦点或前台状态。

## 系统要求

- Windows 11
- 滚动受保护或以管理员权限运行的应用（例如部分手机远程控制工具）时，可能需要管理员权限。

## 安装

1. 从 [Releases](https://github.com/ai-blink/GazeScroll/releases) 下载 `GazeScroll-<版本>-win.zip`。
2. 解压 ZIP 文件。
3. 运行 `GazeScroll.exe`。

无需安装。

> 如需滚动受保护窗口或管理员权限窗口，请以管理员身份运行 GazeScroll。详见[工作原理](#工作原理)。

## 使用方法

| 想做什么 | 操作方法 |
| --- | --- |
| **滚动或触发按键** | 将指针停在按钮上 **700ms** 即可触发；持续停留可重复滚动。 |
| **打开设置或移动按钮** | 按 **Alt+E**，或在屏幕上的 **🔑 编辑按钮**停留三秒。选择 **完成编辑** 后会保存并回到正常模式。 |
| **显示或隐藏 GazeScroll** | 按 **Alt+F12**，或单击托盘图标。 |
| **退出** | 触发屏幕上的 **⏻ 按钮**，或右键单击托盘图标后选择退出。 |

可在设置中调整以下内容：

- **凝视**或**点击**
- **单次操作**或**重复**
- 滚动传递方式和凝视时间

设置保存于：

```text
%APPDATA%\gazescroll\gazescroll\settings.json
```

删除此文件即可恢复默认布局：屏幕中央的 ▲ 和 ▼ 按钮。

## 设置

进入编辑模式后可使用三个设置标签页：

- **行为**——凝视/点击、单次/重复、滚动方式（`自动`、`Chrome 模式`、`经典`或`真实滚轮`）及凝视时间。
- **外观**——界面语言、按钮大小和形状、凝视指示器样式、配色、边框和透明度。
- **附着窗口**——开启或关闭窗口附着、选择八方向锚点位置、管理允许窗口列表。

**✉ 联系方式**按钮会打开关于窗口，其中包含应用、作者、许可证和联系信息。

<details>
<summary><strong>工作原理</strong></summary>

### 不同应用接收滚动输入的方式不同

全局滚动并不适用于单一方案。GazeScroll 会根据目标窗口的类名选择传递方式。

| 方式 | 适用对象 | 实现 |
| --- | --- | --- |
| **Post** | Chrome、Edge、Electron 等 Chromium 应用 | 向顶层窗口发送 `PostMessage(WM_MOUSEWHEEL)` |
| **Child** | 记事本、终端、KakaoTalk 等经典 Win32 应用 | 向最深层子控件发送 `WM_MOUSEWHEEL` |
| **Inject** | 忽略已发送消息的应用，例如手机远程控制应用 | 通过 `SendInput` 发送真实 OS 滚轮事件 |
| **Auto**（默认） | 大多数应用 | 对 `Chrome_WidgetWin*` 使用 `Post`，其他使用 `Child` |

- Chromium 应用通常会忽略发送给子控件的合成滚轮消息，却会处理发送给顶层窗口的消息。
- 经典 Win32 应用通常在最深层子控件中处理滚动消息。
- `Inject` 不会移动指针。由于叠加层会点击穿透，GazeScroll 按钮必须位于目标窗口内容上方；窗口附着功能会自动保持这个位置。
- GazeScroll 会记住最后一个非叠加层前台窗口作为滚动目标，并会在按住鼠标左键时冻结目标更新。

### 悬停判定

叠加层必须保持点击穿透，以便滚轮输入传递给下方应用。不可聚焦的 Electron 窗口不能依赖常规鼠标移动事件，因此 GazeScroll 每 50ms 读取一次全局指针位置来判定悬停和凝视。

窗口使用 `focusable: false` 和 `showInactive()`，因此不会夺取焦点或前台状态。

### 项目结构

```text
src/
  main/index.ts             叠加窗口、托盘、全局快捷键、IPC、指针和目标窗口轮询
  main/input.ts             koffi Win32 FFI：滚动、按键输入、指针读取、窗口枚举
  main/settings.ts          设置类型、默认值、加载和保存
  preload/index.ts          contextBridge IPC API (window.api)
  renderer/src/main.ts      按钮 UI、凝视/点击判定、窗口附着、设置面板、关于对话框
  renderer/src/style.css    按钮、进度指示器、面板和视觉样式
  shared/i18n.ts            main 与 renderer 共用的本地化字典
```

renderer 不会直接导入 main 进程模块，而是只通过 preload 提供的 `window.api` IPC 桥接通信。`input.ts` 是不依赖 Electron 的纯 Win32 FFI 代码。

### 打包

```bash
npm run dist
# 输出：dist-release/GazeScroll-<版本>-win.zip
```

由于便携式 Windows 可执行文件无法可靠地嵌入所请求的权限提升级别，发布版本使用 ZIP 目标。原生 `koffi` 绑定必须保持在 ASAR 包外。

### 已知限制

- **Chromium 应用中的点击模式：** 当 Chromium 正在处理点击时，可能拒绝合成滚轮输入，因此无法稳定地同时保证点击穿透与滚动。主要的凝视模式可正常工作。
- **管理员应用和受保护界面：** Windows UIPI 可能会阻止来自非管理员叠加层的输入；需要时请以管理员身份运行 GazeScroll。

</details>

## 开发

```bash
npm install
npm run dev       # 启动 electron-vite 开发模式
npx tsc --noEmit  # 类型检查
npm run build     # 生产构建
npm run dist      # 创建发布 ZIP
```

## 许可证与联系

MIT © 2026 BlinkLabs。只要保留版权声明，您可以自由使用、修改和再发布本项目。详见 [LICENSE](LICENSE)。

联系邮箱：tia_access@naver.com
