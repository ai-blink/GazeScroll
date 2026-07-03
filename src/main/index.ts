import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen, shell } from 'electron'
import { join } from 'path'
import { scrollPost, scrollPostTop, scrollInject, refreshScrollTarget, getTargetRect, getCursorScreenPos, keyPress, isLeftMouseDown, foregroundExe, listWindows } from './input'
import { loadSettings, saveSettings, Settings } from './settings'
import { t } from '../shared/i18n'

let overlay: BrowserWindow | null = null
let tray: Tray | null = null
let settings: Settings
let visible = true
let editMode = false
let overlayHwndAddr = 0n // 오버레이 자신의 HWND 주소(스크롤 시 자기 창 제외용)

function readHwndAddr(win: BrowserWindow): bigint {
  try {
    const buf = win.getNativeWindowHandle()
    return buf.length >= 8 ? buf.readBigUInt64LE(0) : BigInt(buf.readUInt32LE(0))
  } catch {
    return 0n
  }
}

function createOverlay(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  settings = loadSettings(width, height)

  overlay = new BrowserWindow({
    x, y, width, height,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    focusable: false,  // 클릭해도 오버레이가 포커스/포그라운드를 뺏지 않음(대상앱 유지)
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    }
  })

  overlay.setAlwaysOnTop(true, 'screen-saver')
  overlay.setIgnoreMouseEvents(true, { forward: true })

  // renderer console → main stdout
  overlay.webContents.on('console-message', (_e, level, msg, line, src) => {
    const lvl = ['verbose','info','warn','error'][level] ?? 'log'
    console.log(`[renderer:${lvl}] ${msg}  (${src}:${line})`)
  })

  const load = process.env['ELECTRON_RENDERER_URL']
    ? overlay.loadURL(process.env['ELECTRON_RENDERER_URL'])
    : overlay.loadFile(join(__dirname, '../renderer/index.html'))

  load.then(() => {
    // showInactive: 포커스를 뺏지 않고 표시 → 사용자가 쓰던 앱이 포그라운드로 유지됨
    // (overlay.show()는 오버레이를 포그라운드로 만들어 스크롤이 자기 창으로 가는 버그를 유발)
    overlay?.showInactive()
    overlay?.moveTop()
    if (overlay) overlayHwndAddr = readHwndAddr(overlay)
    startCursorPolling()
  }).catch(console.error)
}

// 전역 커서 위치를 폴링해 renderer로 보낸다 (forward mousemove가 비포커스 클릭스루 창엔
// 오지 않으므로 — AltController 방식). renderer는 이 좌표로 버튼 hover/dwell을 판정한다.
let cursorTimer: ReturnType<typeof setInterval> | null = null
function startCursorPolling(): void {
  if (cursorTimer) return
  cursorTimer = setInterval(() => {
    // 편집모드에도 계속 폴링 → renderer가 커서 좌표로 ignoreMouse 토글(mousemove는 비포커스
    // 클릭스루 창엔 안 오므로 폴링이 유일하게 신뢰 가능한 신호)
    // isDestroyed 가드: 종료 시 창이 파괴돼도 타이머가 한 틱 더 돌아 "Object has been destroyed" 무한 발생 방지
    if (!overlay || overlay.isDestroyed() || overlay.webContents.isDestroyed() || !visible) return
    // 스크롤 대상 창 lock 갱신. 단 좌클릭이 눌린 동안은 동결 — 클릭 동작이 포그라운드를
    // 안구마우스 SW/시스템 창으로 잠깐 튀게 하므로, 클릭 직전의 대상 창을 고정해야 한다.
    // (오버레이가 포그라운드인 경우도 refreshScrollTarget 내부에서 스킵)
    const pressed = isLeftMouseDown()
    // 붙일 창 허용 목록: 비어 있으면 전체 허용(기존 동작). 목록이 있으면 포그라운드 exe가
    // 목록에 있을 때만 lock 갱신 → 다른 창을 포커스해도 지정한 창을 계속 추종/스크롤.
    if (!pressed) {
      const allow = settings.attachAllow
      if (allow.length === 0 || allow.includes(foregroundExe())) {
        refreshScrollTarget(overlayHwndAddr)
      }
    }
    const p = getCursorScreenPos()
    if (!p) return
    // 물리 픽셀 → DIP(CSS px), 그리고 오버레이 창 기준 좌표로 변환
    const dip = screen.screenToDipPoint({ x: p.x, y: p.y })
    const b = overlay.getBounds()
    overlay.webContents.send('cursor', Math.round(dip.x - b.x), Math.round(dip.y - b.y), pressed)

    // 붙이기 모드: 대상 창 사각형을 오버레이 기준 CSS px로 변환해 전송 → renderer가 리모컨을 그 위에 앵커.
    if (settings.attachMode) {
      const r = getTargetRect()
      if (r) {
        const tl = screen.screenToDipPoint({ x: r.left, y: r.top })
        const br = screen.screenToDipPoint({ x: r.right, y: r.bottom })
        overlay.webContents.send('target-rect',
          Math.round(tl.x - b.x), Math.round(tl.y - b.y),
          Math.round(br.x - tl.x), Math.round(br.y - tl.y))
      }
    }
  }, 50)
}

function createTray(): void {
  // 트레이 아이콘 = 앱 아이콘(build/icon.ico)에서 뽑은 32px PNG를 base64 임베드(패키지에서도 경로 의존 없이 로드).
  const trayIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,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'
  )
  tray = new Tray(trayIcon)
  tray.on('click', () => toggleOverlay())
  applyTrayLang()
}

// 트레이 메뉴·툴팁을 현재 settings.lang로 (재)구성. 언어 변경(save-settings) 시에도 호출해 즉시 반영.
function applyTrayLang(): void {
  if (!tray) return
  const L = t(settings.lang)
  const menu = Menu.buildFromTemplate([
    { label: L.trayToggle, click: () => toggleOverlay() },
    { label: L.trayQuit, click: () => { app.quit() } }
  ])
  tray.setToolTip(L.trayTooltip)
  tray.setContextMenu(menu)
}

function toggleOverlay(): void {
  if (!overlay) return
  visible = !visible
  if (visible) overlay.show()
  else overlay.hide()
}

ipcMain.on('set-ignore-mouse', (_e, ignore: boolean) => {
  overlay?.setIgnoreMouseEvents(ignore, { forward: true })
})

ipcMain.on('scroll', (_e, dir: 'up' | 'down', _sx: number, _sy: number) => {
  // 오버레이는 항상 클릭스루(renderer가 유지) → 별도 토글 불필요.
  // 스크롤 방식은 settings.scrollMethod로 수동 선택(앱마다 휠 받는 방식이 달라 사용자가 테스트해 고른다):
  //   post  = top-level 창에 WM_MOUSEWHEEL PostMessage (크롬 등 Chromium, 커서 불변) — FlowType 패턴
  //   child = 자식 컨트롤에 WM_MOUSEWHEEL PostMessage (메모장 등 클래식 Win32, 커서 불변)
  //   inject= SendInput 실제 휠 (현재 커서 위치, PostMessage 무시 앱 폴백) — AltController 패턴
  const clicks = settings.scrollClicks  // 스크롤 감도(1회당 휠 노치 수)
  switch (settings.scrollMethod) {
    case 'child':
      scrollPost(dir, overlayHwndAddr, clicks)
      break
    case 'inject':
      scrollInject(dir, clicks)
      break
    default: // 'post'
      scrollPostTop(dir, overlayHwndAddr, clicks)
  }
})

ipcMain.on('key-press', (_e, vk: number, scan: number, scanMode: boolean) => {
  keyPress(vk, scan, scanMode)
})

ipcMain.on('save-buttons', (_e, buttons) => {
  settings.buttons = buttons
  saveSettings(settings)
})

ipcMain.handle('get-settings', () => settings)

// 앱 버전(package.json → app.getVersion()). 설정 패널 정보 줄 표시용.
ipcMain.handle('get-version', () => app.getVersion())

// 문의 버튼: 외부 링크/메일(mailto)을 기본 앱으로 연다. (mailto/http만 허용 — 임의 프로토콜 차단)
ipcMain.on('open-external', (_e, url: string) => {
  if (/^(mailto:|https?:)/i.test(url)) shell.openExternal(url)
})

// 붙일 창 허용 목록 UI용: 현재 보이는 창 목록(제목·클래스·exe명).
ipcMain.handle('list-windows', () => listWindows())

ipcMain.on('save-settings', (_e, newSettings: Partial<Settings>) => {
  settings = { ...settings, ...newSettings }
  saveSettings(settings)
  applyTrayLang()  // 언어가 바뀌었을 수 있으니 트레이도 갱신(값 동일하면 무해)
})

ipcMain.on('toggle-overlay', () => toggleOverlay())

ipcMain.on('set-edit-mode', (_e, enabled: boolean) => {
  editMode = enabled
  // 편집모드여도 창 전체를 막지 않는다. 항상 클릭스루+forward 유지 →
  // renderer가 커서가 UI(버튼·패널) 위일 때만 setIgnore(false)로 토글한다.
  // (전체를 false로 막으면 화면 전역에서 다른 앱 클릭이 차단됨)
  overlay?.setIgnoreMouseEvents(true, { forward: true })
  // 편집모드에서만 키보드 포커스 허용(설정 패널 숫자 입력 타이핑). 평소엔 false로 포커스 탈취 방지.
  overlay?.setFocusable(enabled)
  if (enabled) overlay?.focus()
})

ipcMain.on('quit', () => app.quit())

app.whenReady().then(() => {
  createOverlay()
  createTray()
  globalShortcut.register('Alt+F12', () => toggleOverlay())
  globalShortcut.register('Alt+E', () => {
    editMode = !editMode
    overlay?.webContents.send('set-edit-mode', editMode)
    if (!editMode) overlay?.setIgnoreMouseEvents(true, { forward: true })
  })
})

app.on('before-quit', () => {
  // 폴링 타이머를 먼저 멈춘다 — 창 파괴 후 타이머가 한 틱 더 돌아 파괴된 객체 접근하는 것 방지
  if (cursorTimer) { clearInterval(cursorTimer); cursorTimer = null }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // tray app — don't quit on window close
})
