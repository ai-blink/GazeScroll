// koffi FFI for user32.dll — 스크롤 + 키 합성.
//
// 스크롤은 대상 앱 종류에 따라 두 경로로 나뉜다 (앱마다 받는 방식이 정반대):
//   1) 클래식 Win32 (메모장 Edit 등): PostMessage(WM_MOUSEWHEEL)을 자식 컨트롤에 전송.
//      SendInput 휠은 무시되지만 합성 PostMessage는 처리한다. 커서를 건드리지 않는다.
//   2) Chromium (크롬/Edge/Electron 등): SendInput으로 실제 휠 입력 주입.
//      합성 PostMessage는 봇 방지로 무시하므로 OS 입력 큐에 실제 휠을 넣어야 한다.
//      휠은 커서 아래 창으로 가므로 커서를 대상 창 중심으로 잠깐 옮긴 뒤 복원한다.
// 분기는 포그라운드 창 클래스로 판단한다(foregroundClass).
// 키 합성(PgDn 등)은 SendInput 키보드.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let koffiRef: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let user32: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnGetForegroundWindow: (() => any) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnGetWindowRect: ((hwnd: unknown, rect: any) => boolean) | null = null
let fnPostMessageW: ((hwnd: unknown, msg: number, wParam: number, lParam: number) => boolean) | null = null
let fnSendInput: ((count: number, inputs: Buffer, cbSize: number) => number) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnScreenToClient: ((hwnd: unknown, pt: any) => boolean) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnChildWindowFromPointEx: ((hwnd: unknown, pt: any, flags: number) => any) | null = null
let fnGetClassNameW: ((hwnd: unknown, buf: Buffer, max: number) => number) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnGetCursorPos: ((pt: any) => boolean) | null = null
let fnGetAsyncKeyState: ((vKey: number) => number) | null = null
// 붙일 창 목록(EnumWindows) + exe명 조회용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let kernel32: any = null
let fnEnumWindows: ((cb: unknown, lparam: number) => boolean) | null = null
let fnIsWindowVisible: ((hwnd: unknown) => boolean) | null = null
let fnGetWindowTextW: ((hwnd: unknown, buf: Buffer, max: number) => number) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnGetWindowThreadProcessId: ((hwnd: unknown, pidOut: any) => number) | null = null
let fnOpenProcess: ((access: number, inherit: boolean, pid: number) => unknown) | null = null
let fnCloseHandle: ((h: unknown) => boolean) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fnQueryFullProcessImageNameW: ((h: unknown, flags: number, buf: Buffer, sizeOut: any) => boolean) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WNDENUMPROC: any = null

const WM_MOUSEWHEEL = 0x020a
const WHEEL_DELTA = 120
const INPUT_MOUSE = 0
const INPUT_KEYBOARD = 1
const MOUSEEVENTF_WHEEL = 0x0800
const KEYEVENTF_SCANCODE = 0x0008
const KEYEVENTF_KEYUP = 0x0002
const INPUT_SIZE = 40 // sizeof(INPUT) on 64-bit Windows
const CWP_SKIPINVISIBLE = 0x0001

function init(): boolean {
  if (user32) return true
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi')
    koffiRef = koffi
    user32 = koffi.load('user32.dll')
    const RECT = koffi.struct('RECT', { left: 'int32', top: 'int32', right: 'int32', bottom: 'int32' })
    const POINT = koffi.struct('POINT', { x: 'int32', y: 'int32' })
    fnGetForegroundWindow = user32.func('GetForegroundWindow', 'void *', [])
    fnGetWindowRect = user32.func('GetWindowRect', 'bool', ['void *', koffi.out(koffi.pointer(RECT))])
    fnPostMessageW = user32.func('PostMessageW', 'bool', ['void *', 'uint32', 'uintptr_t', 'intptr_t'])
    fnSendInput = user32.func('SendInput', 'uint32', ['uint32', 'uint8 *', 'int32'])
    fnScreenToClient = user32.func('ScreenToClient', 'bool', ['void *', koffi.inout(koffi.pointer(POINT))])
    fnChildWindowFromPointEx = user32.func('ChildWindowFromPointEx', 'void *', ['void *', POINT, 'uint32'])
    fnGetClassNameW = user32.func('GetClassNameW', 'int32', ['void *', 'uint8 *', 'int32'])
    fnGetCursorPos = user32.func('GetCursorPos', 'bool', [koffi.out(koffi.pointer(POINT))])
    fnGetAsyncKeyState = user32.func('GetAsyncKeyState', 'int16', ['int'])
    // 붙일 창 목록: EnumWindows 콜백 + 창 가시성/제목/프로세스 조회, exe명은 kernel32 경유
    kernel32 = koffi.load('kernel32.dll')
    WNDENUMPROC = koffi.proto('bool WndEnumProc(void *hwnd, intptr_t lparam)')
    fnEnumWindows = user32.func('EnumWindows', 'bool', [koffi.pointer(WNDENUMPROC), 'intptr_t'])
    fnIsWindowVisible = user32.func('IsWindowVisible', 'bool', ['void *'])
    fnGetWindowTextW = user32.func('GetWindowTextW', 'int32', ['void *', 'uint8 *', 'int32'])
    fnGetWindowThreadProcessId = user32.func('GetWindowThreadProcessId', 'uint32', ['void *', koffi.out(koffi.pointer('uint32'))])
    fnOpenProcess = kernel32.func('OpenProcess', 'void *', ['uint32', 'bool', 'uint32'])
    fnCloseHandle = kernel32.func('CloseHandle', 'bool', ['void *'])
    fnQueryFullProcessImageNameW = kernel32.func('QueryFullProcessImageNameW', 'bool', ['void *', 'uint32', 'uint8 *', koffi.inout(koffi.pointer('uint32'))])
    return true
  } catch (e) {
    console.error('[input] koffi init failed:', e)
    return false
  }
}

function classNameOf(hwnd: unknown): string {
  if (!fnGetClassNameW) return ''
  const buf = Buffer.alloc(512)
  const len = fnGetClassNameW(hwnd, buf, 256)
  return len > 0 ? buf.slice(0, len * 2).toString('utf16le').replace(/\0.*$/, '') : ''
}

// 현재 커서의 스크린(물리 픽셀) 좌표. (전역 hover 판정 폴링용)
export function getCursorScreenPos(): { x: number; y: number } | null {
  if (!init() || !fnGetCursorPos) return null
  const pt: { x: number; y: number } = { x: 0, y: 0 }
  if (!fnGetCursorPos(pt)) return null
  return pt
}

// 물리 왼쪽 마우스 버튼이 눌려 있는지. (클릭 모드 — 오버레이를 클릭스루로 유지한 채 폴링 감지)
const VK_LBUTTON = 0x01
export function isLeftMouseDown(): boolean {
  if (!init() || !fnGetAsyncKeyState) return false
  return (fnGetAsyncKeyState(VK_LBUTTON) & 0x8000) !== 0
}

// 현재 포그라운드 창의 클래스명. (분기 판단용)
export function foregroundClass(): string {
  if (!init() || !fnGetForegroundWindow) return ''
  const hwnd = fnGetForegroundWindow()
  if (!hwnd) return ''
  return classNameOf(hwnd)
}

// 창 제목(캡션). 빈 문자열이면 제목 없는 창(도구/백그라운드).
function titleOf(hwnd: unknown): string {
  if (!fnGetWindowTextW) return ''
  const buf = Buffer.alloc(1024)
  const len = fnGetWindowTextW(hwnd, buf, 512)
  return len > 0 ? buf.slice(0, len * 2).toString('utf16le').replace(/\0.*$/, '') : ''
}

// 창 소유 프로세스의 실행파일명(basename, 소문자). 붙일 창 허용 목록의 식별 키
// (HWND는 세션마다 바뀌므로 exe명으로 영속화). 실패(보호 프로세스 등)면 빈 문자열.
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
function exeOf(hwnd: unknown): string {
  if (!fnGetWindowThreadProcessId || !fnOpenProcess || !fnQueryFullProcessImageNameW || !fnCloseHandle) return ''
  const pidBox = [0]
  fnGetWindowThreadProcessId(hwnd, pidBox)
  const pid = pidBox[0]
  if (!pid) return ''
  const h = fnOpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
  if (!h) return ''
  try {
    const buf = Buffer.alloc(2048)
    const sizeBox = [1024] // 버퍼 크기(문자 수). 반환 시 실제 기록된 문자 수로 갱신됨.
    if (!fnQueryFullProcessImageNameW(h, 0, buf, sizeBox)) return ''
    const chars = sizeBox[0]
    const full = buf.slice(0, chars * 2).toString('utf16le').replace(/\0.*$/, '')
    return (full.split(/[\\/]/).pop() || '').toLowerCase()
  } catch {
    return ''
  } finally {
    fnCloseHandle(h)
  }
}

// 현재 포그라운드 창의 exe명(소문자). 붙일 창 허용 목록 게이트용.
export function foregroundExe(): string {
  if (!init() || !fnGetForegroundWindow) return ''
  const hwnd = fnGetForegroundWindow()
  if (!hwnd) return ''
  return exeOf(hwnd)
}

// 보이는 top-level 창 목록(제목 있는 것만). exe명 기준 중복 제거(앱 1개=1행).
// 붙일 창 허용 목록 UI가 체크리스트로 보여준다.
export function listWindows(): Array<{ title: string; className: string; exe: string }> {
  if (!init() || !fnEnumWindows || !koffiRef || !WNDENUMPROC) return []
  const out: Array<{ title: string; className: string; exe: string }> = []
  const seen = new Set<string>()
  const cb = koffiRef.register((hwnd: unknown) => {
    try {
      if (fnIsWindowVisible && !fnIsWindowVisible(hwnd)) return true
      const title = titleOf(hwnd)
      if (!title) return true // 제목 없는 창(도구/백그라운드) 제외
      const exe = exeOf(hwnd)
      if (!exe || seen.has(exe)) return true // exe 기준 중복 제거(창 여러 개 → 앱 1개)
      seen.add(exe)
      out.push({ title, className: classNameOf(hwnd), exe })
    } catch {
      // 창 하나 실패는 무시하고 계속
    }
    return true
  }, koffiRef.pointer(WNDENUMPROC))
  try {
    fnEnumWindows(cb, 0)
  } finally {
    koffiRef.unregister(cb)
  }
  return out
}

// ── 스크롤 대상 창 lock ──────────────────────────────────────────────
// 클릭 모드에서 버튼 클릭을 오버레이가 흡수하면 GetForegroundWindow가 일시적으로 흔들려
// PostMessage 대상이 깨진다. 그래서 폴링으로 "마지막 비-오버레이 포그라운드 창"을 기억해두고
// post/child 스크롤은 그 기억된 창에 보낸다(클릭이 잠깐 튀어도 직전 작업 창 유지).
let lockedTargetHwnd: unknown = null

export function refreshScrollTarget(excludeAddr: bigint = 0n): void {
  if (!init() || !fnGetForegroundWindow || !koffiRef) return
  const hwnd = fnGetForegroundWindow()
  if (!hwnd) return
  const addr = BigInt(koffiRef.address(hwnd))
  if (addr === 0n) return
  if (excludeAddr && addr === excludeAddr) return // 오버레이가 포그라운드면 갱신 안 함(직전 타깃 유지)
  lockedTargetHwnd = hwnd
}

// 스크롤을 보낼 대상 창: lock된 창 우선, 없으면 현재 포그라운드.
function scrollTargetHwnd(): unknown {
  if (lockedTargetHwnd) return lockedTargetHwnd
  return fnGetForegroundWindow ? fnGetForegroundWindow() : null
}

// lock된 대상 창의 클래스명. (probe 로그 context — 사용자가 테스트하던 실제 앱)
export function lockedTargetClass(): string {
  if (!lockedTargetHwnd) return foregroundClass()
  return classNameOf(lockedTargetHwnd)
}

// lock된(=추종할) 대상 창의 스크린 사각형(물리 픽셀). 붙이기 모드에서 리모컨을 이 창에 앵커.
export function getTargetRect(): { left: number; top: number; right: number; bottom: number } | null {
  if (!init() || !fnGetWindowRect) return null
  const hwnd = scrollTargetHwnd()
  if (!hwnd) return null
  const rect = { left: 0, top: 0, right: 0, bottom: 0 }
  if (!fnGetWindowRect(hwnd, rect)) return null
  return rect
}

// 포그라운드 top-level 창 안에서 (screenX, screenY) 지점의 가장 깊은 자식 창을 찾는다.
// 클래식 컨트롤은 top-level이 아닌 자식(Edit 등)이 WM_MOUSEWHEEL을 처리하므로 거기까지 내려간다.
// 포그라운드 창 내부만 탐색하므로 오버레이(별도 top-level)는 자동 제외된다.
function deepestChildAt(top: unknown, screenX: number, screenY: number): unknown {
  if (!fnScreenToClient || !fnChildWindowFromPointEx || !koffiRef) return top
  let cur = top
  for (let i = 0; i < 6; i++) {
    const pt = { x: screenX, y: screenY }
    if (!fnScreenToClient(cur, pt)) break
    const child = fnChildWindowFromPointEx(cur, { x: pt.x, y: pt.y }, CWP_SKIPINVISIBLE)
    if (!child) break
    const childAddr = BigInt(koffiRef.address(child))
    const curAddr = BigInt(koffiRef.address(cur))
    if (childAddr === 0n || childAddr === curAddr) break
    cur = child
  }
  return cur
}

// 경로 1: 포그라운드 창(자식 컨트롤)에 WM_MOUSEWHEEL PostMessage. (클래식 Win32용, 커서 불변)
// excludeAddr: 오버레이 자신의 HWND — 오버레이가 포그라운드이면 보내지 않는다.
export function scrollPost(direction: 'up' | 'down', excludeAddr: bigint = 0n, notches: number = 1): boolean {
  if (!init() || !fnGetWindowRect || !fnPostMessageW || !koffiRef) return false
  try {
    const hwnd = scrollTargetHwnd()
    if (!hwnd) return false
    if (excludeAddr && BigInt(koffiRef.address(hwnd)) === excludeAddr) return false

    const rect: { left: number; top: number; right: number; bottom: number } = {
      left: 0, top: 0, right: 0, bottom: 0
    }
    if (!fnGetWindowRect(hwnd, rect)) return false
    const cx = Math.round((rect.left + rect.right) / 2)
    const cy = Math.round((rect.top + rect.bottom) / 2)

    // 실제 휠 처리 자식 컨트롤까지 내려간다 (Edit 등)
    const target = deepestChildAt(hwnd, cx, cy)

    const delta = (direction === 'up' ? WHEEL_DELTA : -WHEEL_DELTA) * notches
    const wParam = (delta << 16) >>> 0
    const lParam = (((cy & 0xffff) << 16) | (cx & 0xffff)) >>> 0
    return fnPostMessageW(target, WM_MOUSEWHEEL, wParam, lParam)
  } catch (e) {
    console.error('[input] scrollPost error:', e)
    return false
  }
}

function sendWheel(direction: 'up' | 'down', notches: number): boolean {
  if (!fnSendInput) return false
  const delta = (direction === 'up' ? WHEEL_DELTA : -WHEEL_DELTA) * notches
  const buf = Buffer.alloc(INPUT_SIZE, 0)
  buf.writeUInt32LE(INPUT_MOUSE, 0) // type
  buf.writeInt32LE(delta, 16) // mouseData (signed wheel delta)
  buf.writeUInt32LE(MOUSEEVENTF_WHEEL, 20) // dwFlags
  return fnSendInput(1, buf, INPUT_SIZE) === 1
}

// 경로 2a (기본, Chromium용): 포그라운드 top-level 창에 직접 WM_MOUSEWHEEL PostMessage.
// 크롬은 자식(Chrome_RenderWidgetHostHWND) 합성 휠은 무시하지만, top-level(Chrome_WidgetWin_*)에
// 보내면 자체 hit-test로 처리한다. (FlowType OSK가 실사용으로 입증한 방식)
// 커서를 전혀 건드리지 않으며 lParam=창 중앙이라 버튼 위치와도 무관하다.
// excludeAddr: 오버레이 자신의 HWND — 오버레이가 포그라운드이면 보내지 않는다.
export function scrollPostTop(direction: 'up' | 'down', excludeAddr: bigint = 0n, notches: number = 1): boolean {
  if (!init() || !fnGetWindowRect || !fnPostMessageW || !koffiRef) return false
  try {
    const hwnd = scrollTargetHwnd()
    if (!hwnd) return false
    if (excludeAddr && BigInt(koffiRef.address(hwnd)) === excludeAddr) return false

    const rect: { left: number; top: number; right: number; bottom: number } = {
      left: 0, top: 0, right: 0, bottom: 0
    }
    if (!fnGetWindowRect(hwnd, rect)) return false
    const cx = Math.round((rect.left + rect.right) / 2)
    const cy = Math.round((rect.top + rect.bottom) / 2)

    const delta = (direction === 'up' ? WHEEL_DELTA : -WHEEL_DELTA) * notches
    const wParam = (delta << 16) >>> 0
    const lParam = (((cy & 0xffff) << 16) | (cx & 0xffff)) >>> 0
    // 자식으로 내려가지 않고 top-level에 직접 보낸다 (크롬 핵심)
    return fnPostMessageW(hwnd, WM_MOUSEWHEEL, wParam, lParam)
  } catch (e) {
    console.error('[input] scrollPostTop error:', e)
    return false
  }
}

// 경로 2b (폴백): SendInput으로 실제 휠 입력 주입. PostMessage를 무시하는 일부 앱/게임용.
// 휠은 "커서 아래" 창으로 간다. 오버레이는 클릭스루(WS_EX_TRANSPARENT)라 휠이 통과해 뒤 앱으로 가므로,
// 버튼(=응시 커서) 위치의 콘텐츠가 스크롤된다. 커서는 옮기지 않는다 — 조이마우스(AltController)와 동일.
// (이전엔 커서를 창 중앙으로 순간이동/복원했으나, 이동 지점에 다른 창이 있으면 오작동하는 버그가 있어 제거)
export function scrollInject(direction: 'up' | 'down', notches: number = 1): boolean {
  if (!init() || !fnSendInput) return false
  try {
    return sendWheel(direction, notches)
  } catch (e) {
    console.error('[input] scrollInject error:', e)
    return false
  }
}

export function keyPress(vk: number, scan: number, scanMode: boolean): boolean {
  if (!init() || !fnSendInput) return false
  try {
    // 두 INPUT 구조체: keydown + keyup (각 40 bytes)
    const buf = Buffer.alloc(INPUT_SIZE * 2, 0)
    const flags = scanMode ? KEYEVENTF_SCANCODE : 0
    const flagsUp = scanMode ? KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP : KEYEVENTF_KEYUP

    // INPUT[0] keydown
    buf.writeUInt32LE(INPUT_KEYBOARD, 0)
    buf.writeUInt16LE(scanMode ? 0 : vk, 8)
    buf.writeUInt16LE(scan, 10)
    buf.writeUInt32LE(flags, 12)

    // INPUT[1] keyup (starts at offset 40)
    buf.writeUInt32LE(INPUT_KEYBOARD, 40)
    buf.writeUInt16LE(scanMode ? 0 : vk, 48)
    buf.writeUInt16LE(scan, 50)
    buf.writeUInt32LE(flagsUp, 52)

    const sent = fnSendInput(2, buf, INPUT_SIZE)
    return sent === 2
  } catch (e) {
    console.error('[input] keyPress error:', e)
    return false
  }
}
