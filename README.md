# GazeScroll

> **Scroll any Windows app by hovering a button — no mouse wheel and no click required.**
>
> A lightweight, always-on-top remote for Windows 11, designed especially for eye tracking and other limited-input environments.

[![Platform](https://img.shields.io/badge/Windows-11-0078D4)](#requirements)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Interface languages](https://img.shields.io/badge/UI-7%20languages-1f6feb)](#features)

<p align="center">
  <strong>[English]</strong> · <a href="README.ko.md">[한국어]</a> · <a href="README.zh-CN.md">[简体中文]</a> · <a href="README.ja.md">[日本語]</a>
</p>

![GazeScroll demo — hovering over a button scrolls the app underneath](assets/hero.gif)

---

## What is GazeScroll?

GazeScroll places a small floating control on your screen. Hover the mouse pointer over its ▲ or ▼ button for a moment, and the application you are using scrolls automatically.

It is a transparent, click-through overlay, so it can work above Chrome, Notepad, terminals, KakaoTalk, and many other Windows applications without blocking them or taking focus away.

No mouse wheel. No physical click.

## Who is it for?

- **People who have difficulty using a mouse wheel, keyboard, or physical mouse controls** — including people using eye-tracking input, gaze mice, or other accessibility devices. GazeScroll lets you scroll and trigger keys using pointer movement alone.
- **People who scroll repeatedly while working** — it can reduce repeated wheel and click actions during long sessions with documents, websites, and other scrollable content.

## Why is it intentionally simple?

- **No learning curve** — ▲ and ▼ buttons are immediately understandable.
- **Visible dwell feedback** — a progress indicator fills while you hover, so you can see when an action is about to trigger.
- **A focused three-tab settings panel** — only the controls you actually need.

GazeScroll aims to offer a lighter, more direct alternative to complex accessibility tools.

## Demo

![Hover over a button to scroll](assets/dwell.gif)

| Appearance settings | Choose which windows to attach to |
| :--: | :--: |
| ![Appearance settings](assets/settings.png) | ![Attached-window allow list](assets/winlist.png) |

## Features

- **Hover-to-scroll** — hold the pointer over a button for a configurable dwell time to scroll. Physical clicking is not required.
- **Click mode** — available when you prefer an immediate action.
- **Attach to a window** — the button group can follow a target window as it moves or resizes. Choose from eight anchor positions.
- **Window allow list** — attach only to selected applications, or leave the list empty to allow all windows.
- **Custom appearance** — button size, circle/rounded/square shapes, four dwell-indicator styles, seven color palettes, borders, and opacity.
- **Seven interface languages** — Korean, English, Japanese, Simplified Chinese, Traditional Chinese, Hindi, and Spanish.
- **Does not interrupt your work** — stays in the system tray, remains on top, and does not steal focus or foreground status from the application you are using.

## Requirements

- Windows 11
- Administrator privileges may be needed when scrolling protected or elevated applications, such as some phone remote-control tools.

## Installation

1. Download `GazeScroll-<version>-win.zip` from [Releases](https://github.com/ai-blink/GazeScroll/releases).
2. Extract the ZIP archive.
3. Run `GazeScroll.exe`.

No installation is required.

> To scroll protected or elevated windows, run GazeScroll as Administrator. See [How it works](#how-it-works) for details.

## How to use it

| What you want to do | How |
| --- | --- |
| **Scroll or trigger a key** | Hover over a button for **700 ms** to trigger it. Keep hovering to repeat scrolling. |
| **Open settings or move buttons** | Press **Alt+E**, or dwell on the on-screen **🔑 edit button** for three seconds. Select **Finish editing** to save and return to normal mode. |
| **Show or hide GazeScroll** | Press **Alt+F12**, or click the tray icon. |
| **Exit** | Trigger the on-screen **⏻ button**, or right-click the tray icon and select Exit. |

You can change the interaction method in Settings:

- **Dwell** or **Click**
- **Single action** or **Repeat**
- Scroll delivery method and dwell duration

Settings are saved at:

```text
%APPDATA%\gazescroll\gazescroll\settings.json
```

Delete that file to restore the default layout: ▲ and ▼ buttons in the middle of the screen.

## Settings

Open Edit mode to access three settings tabs:

- **Behavior** — dwell/click mode, single/repeat behavior, scroll method (`Auto`, `Chrome-style`, `Classic`, or `Real wheel`), and dwell duration.
- **Appearance** — UI language, button size and shape, dwell indicator style, color palette, border, and opacity.
- **Attach to window** — turn attachment on or off, select an eight-way anchor position, and manage the allowed-window list.

The **✉ Contact** button opens an About dialog with app details, author information, license information, and contact details.

<details>
<summary><strong>How it works</strong></summary>

### Different applications receive scroll input differently

Global scrolling is not one-size-fits-all. GazeScroll selects a delivery method based on the target window class.

| Method | Best for | Implementation |
| --- | --- | --- |
| **Post** | Chromium applications such as Chrome, Edge, and Electron apps | Sends `WM_MOUSEWHEEL` with `PostMessage` to the top-level window |
| **Child** | Classic Win32 apps such as Notepad, terminals, and KakaoTalk | Sends `WM_MOUSEWHEEL` to the deepest child control |
| **Inject** | Apps that ignore posted messages, including phone remote-control apps | Sends a real OS wheel event with `SendInput` |
| **Auto** (default) | Most applications | Uses `Post` for `Chrome_WidgetWin*`; otherwise uses `Child` |

- Chromium applications generally ignore a synthetic wheel message sent to a child control, but accept it on the top-level window.
- Classic Win32 applications often process scroll messages in their deepest child control.
- `Inject` does not move the pointer. Because the overlay is click-through, the GazeScroll button must be positioned over the target window’s content. Window attachment keeps it there automatically.
- GazeScroll remembers the last non-overlay foreground window as its scroll target and freezes target updates while the left mouse button is held.

### Hover detection

The overlay must stay click-through so wheel input reaches the app below it. Since a non-focusable Electron window cannot rely on normal mouse-move events, GazeScroll polls the global cursor position every 50 ms and performs hover/dwell detection from that position.

The window uses `focusable: false` and `showInactive()`, so it does not steal focus or foreground status.

### Project structure

```text
src/
  main/index.ts             Overlay window, tray, global shortcuts, IPC, cursor and target-window polling
  main/input.ts             koffi Win32 FFI: scrolling, key input, cursor reads, window enumeration
  main/settings.ts          Settings types, defaults, loading, and saving
  preload/index.ts          contextBridge IPC API (window.api)
  renderer/src/main.ts      Button UI, dwell/click detection, attachment, settings panel, About dialog
  renderer/src/style.css    Button, gauge, panel, and visual styles
  shared/i18n.ts            Shared localization dictionary for main and renderer
```

The renderer never imports main-process modules directly. It communicates only through the preload `window.api` IPC bridge. `input.ts` remains pure Win32 FFI code without Electron dependencies.

### Packaging

```bash
npm run dist
# Output: dist-release/GazeScroll-<version>-win.zip
```

The release uses a ZIP target because portable Windows executables cannot reliably embed the requested elevation level. Native `koffi` bindings must remain unpacked from ASAR.

### Known limitations

- **Click mode in Chromium apps:** Chromium can reject synthetic wheel input while it absorbs the click, so GazeScroll cannot reliably provide both click-through behavior and scrolling in this case. The primary dwell mode works normally.
- **Elevated apps and protected surfaces:** Windows UIPI may block input sent from a non-elevated overlay. Run GazeScroll as Administrator when necessary.

</details>

## Development

```bash
npm install
npm run dev       # Start electron-vite development mode
npx tsc --noEmit  # Type-check
npm run build     # Production build
npm run dist      # Create the release ZIP
```

## License and contact

MIT © 2026 BlinkLabs. You may use, modify, and redistribute this project as long as the copyright notice is retained. See [LICENSE](LICENSE).

Contact: tia_access@naver.com
