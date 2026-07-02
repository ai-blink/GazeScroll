import './style.css'
import { t, LANGS, type Lang } from '../../shared/i18n'

declare global {
  interface Window {
    api: {
      setIgnoreMouse: (ignore: boolean) => void
      scroll: (dir: 'up' | 'down', screenX: number, screenY: number) => void
      keyPress: (vk: number, scan: number, scanMode: boolean) => void
      saveButtons: (buttons: unknown[]) => void
      getSettings: () => Promise<Settings>
      getVersion: () => Promise<string>
      openExternal: (url: string) => void
      listWindows: () => Promise<Array<{ title: string; className: string; exe: string }>>
      saveSettings: (settings: unknown) => void
      toggleOverlay: () => void
      setEditMode: (enabled: boolean) => void
      onSetEditMode: (callback: (enabled: boolean) => void) => void
      onCursor: (callback: (x: number, y: number, pressed: boolean, targetIsChrome: boolean) => void) => void
      onTargetRect: (callback: (x: number, y: number, w: number, h: number) => void) => void
      quit: () => void
    }
  }
}

interface ButtonConfig {
  id: string
  glyph: string
  label: string
  x: number
  y: number
  action: 'scroll-up' | 'scroll-down' | 'key' | 'quit'
  vk?: number
  scan?: number
  scanMode?: boolean
}

interface Settings {
  buttons: ButtonConfig[]
  dwellMs: number
  restOpacity: number
  btnSize: number
  btnRadius: string
  gaugeStyle: 'fill' | 'fill-lr' | 'circular' | 'expand'
  gaugeColor: string
  btnBg: string
  btnFg: string
  borderWidth: number
  borderColor: string
  fontSize: number
  triggerMode: 'dwell' | 'click'
  repeatMode: 'single' | 'repeat'
  repeatMs: number
  scrollClicks: number
  scrollMethod: 'inject' | 'post' | 'child'
  editKey: { x: number; y: number } | null
  editHoldMs: number
  attachMode: boolean
  attachAnchor: 'tl' | 't' | 'tr' | 'l' | 'r' | 'bl' | 'b' | 'br'
  attachAllow: string[]
  lang: Lang
}

const overlayEl = document.getElementById('overlay')!
let settings: Settings | null = null
let editMode = false
let zTop = 10
const buttons = new Map<string, { el: HTMLElement; cfg: ButtonConfig }>()

let lastIgnore = true
function setIgnore(ignore: boolean): void {
  if (ignore === lastIgnore) return
  lastIgnore = ignore
  window.api.setIgnoreMouse(ignore)
}

// 일반 모드: 오버레이는 '항상 클릭스루'를 유지하고, 버튼 hover는 main의 전역 커서 폴링
// 좌표로 판정한다 (AltController 패턴). forward mousemove는 비포커스 클릭스루 창엔 오지
// 않으므로 main의 GetCursorPos 폴링 좌표(window.api.onCursor)를 쓴다.
// 이렇게 해야 스크롤 휠이 버튼(=커서) 아래 대상 창에 닿고, hover가 끊기지 않아 반복이 부드럽다.
let currentHoverId: string | null = null

function updateHover(clientX: number, clientY: number): void {
  const el = document.elementFromPoint(clientX, clientY)
  const btn = el?.closest('.rbtn:not(.edit-key)') as HTMLElement | null  // 🔑는 onCursor에서 직접 처리
  const id = btn?.dataset.id ?? null
  if (id !== currentHoverId) {
    if (currentHoverId) leaveDwell(currentHoverId)
    currentHoverId = id
    if (id) enterDwell(id)
  }
}

// main 커서 폴링(50ms)으로 모든 ignoreMouse 토글·hover 판정을 한다.
// (forward mousemove는 비포커스 클릭스루 창엔 안 오므로 폴링이 유일한 신뢰 신호 — AltController 방식)
//  - 편집모드: 커서가 버튼·설정패널 위일 때만 클릭 가능(드래그 중엔 고정). 빈 곳은 통과.
//  - 클릭모드: 액션 버튼 위일 때만 클릭 가능(🔑 제외). 빈 곳은 통과. + 🔑 gaze 처리.
//  - 드웰모드: 항상 클릭스루 유지하고 gaze로 dwell 판정.
let dragActive = false
let editKeyCharging = false
window.api.onCursor((x, y, pressed, targetIsChrome) => {
  if (editMode) {
    // 편집모드만 오버레이를 인터랙티브로(패널·드래그 실제 클릭). 빈 곳은 통과, 드래그 중 고정.
    if (!dragActive) {
      const el = document.elementFromPoint(x, y)
      setIgnore(!el?.closest('.rbtn, #settings-panel'))
    }
    return
  }
  // 🔑 편집키: 작동 방식에 맞춰 충전. dwell=3초 응시, click=3초 물리 길게누름.
  const el = document.elementFromPoint(x, y)
  const overEditKey = !!el?.closest('.edit-key')
  const charging = overEditKey && (settings?.triggerMode === 'click' ? pressed : true)
  if (charging && !editKeyCharging) { editKeyCharging = true; enterEditCharge() }
  else if (!charging && editKeyCharging) { editKeyCharging = false; leaveEditCharge() }

  if (settings?.triggerMode === 'click') {
    // 버튼 위면 클릭스루를 꺼 클릭을 흡수(뒤로 안 뚫림), 빈 곳은 통과 → 메모장·도스·카톡 등에서 안 뚫림 + 스크롤.
    // 단 크롬(Chromium)만 흡수 중 휠을 거부하므로, 대상이 크롬일 때만 흡수를 끈다(클릭스루 유지)
    // → 크롬만 뚫리지만 스크롤됨. 이건 크롬 자체 한계라 크롬에 국한된 불가피한 예외다.
    const overBtn = !!el?.closest('.rbtn')
    setIgnore(targetIsChrome ? true : !overBtn)
    handleClickPoll(x, y, pressed)  // 액션 버튼 물리 클릭(🔑 제외)
    return
  }
  updateHover(x, y)  // dwell 액션 버튼
})

// 클릭모드 폴링 감지: 버튼 위에서 물리 좌클릭 누름 → 발동(반복이면 뗄 때까지). 오버레이는
// 클릭스루라 클릭이 뒤 앱에도 전달됨(버튼은 빈 영역 배치 권장).
let clickHeldId: string | null = null
function stopClickRepeat(id: string): void {
  const r = clickState.get(id)
  if (r) { clearInterval(r); clickState.delete(id) }
}
function handleClickPoll(x: number, y: number, pressed: boolean): void {
  const el = document.elementFromPoint(x, y)
  const btn = el?.closest('.rbtn:not(.edit-key)') as HTMLElement | null
  const id = btn?.dataset.id ?? null
  if (pressed && id && clickHeldId !== id) {
    if (clickHeldId) stopClickRepeat(clickHeldId)
    clickHeldId = id
    const entry = buttons.get(id)
    if (entry) {
      fireButton(entry.cfg, entry.el)
      if (settings?.repeatMode === 'repeat') {
        clickState.set(id, setInterval(() => fireButton(entry.cfg, entry.el), settings?.repeatMs ?? 250))
      }
    }
  } else if (clickHeldId && (!pressed || id !== clickHeldId)) {
    // 떼거나 버튼 밖으로 이동 → 정지
    stopClickRepeat(clickHeldId)
    clickHeldId = null
  }
}

function fireButton(cfg: ButtonConfig, el: HTMLElement): void {
  el.classList.add('fired')
  setTimeout(() => el.classList.remove('fired'), 350)

  if (cfg.action === 'scroll-up' || cfg.action === 'scroll-down') {
    const rect = el.getBoundingClientRect()
    const cx = Math.round(rect.left + rect.width / 2)
    const cy = Math.round(rect.top + rect.height / 2)
    const dir = cfg.action === 'scroll-up' ? 'up' : 'down'
    window.api.scroll(dir, cx, cy)
  } else if (cfg.action === 'key') {
    window.api.keyPress(cfg.vk ?? 0, cfg.scan ?? 0, cfg.scanMode ?? false)
  } else if (cfg.action === 'quit') {
    window.api.quit()
  }
}

// 🔑 편집키: 3초 응시(길게 누름)하면 편집모드 진입 (키보드 Alt+E 없이 안구마우스로)
const EDIT_KEY_ID = '__edit'
const QUIT_KEY_ID = '__quit'
const EDIT_HOLD_MS = 3000
let editKeyEl: HTMLElement | null = null
let editChargeTimer: ReturnType<typeof setTimeout> | null = null

function enterEditCharge(): void {
  if (editMode || !editKeyEl) return
  editKeyEl.classList.add('dwell-active')
  editChargeTimer = setTimeout(() => applyEditMode(true), settings?.editHoldMs ?? EDIT_HOLD_MS)
}

function leaveEditCharge(): void {
  if (editChargeTimer) { clearTimeout(editChargeTimer); editChargeTimer = null }
  editKeyEl?.classList.remove('dwell-active')
}

// 중앙 dwell 상태 (버튼 id → 타이머). hover 판정은 전역 mousemove가 담당.
const dwellState = new Map<string, { charge: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null }>()
// 클릭 모드 반복 타이머 (버튼 id → interval)
const clickState = new Map<string, ReturnType<typeof setInterval>>()

function enterDwell(id: string): void {
  if (editMode) return
  if (id === EDIT_KEY_ID) { enterEditCharge(); return }
  if (settings?.triggerMode === 'click') return  // 클릭 모드: dwell 비활성(클릭 핸들러가 처리)
  const entry = buttons.get(id)
  if (!entry) return
  const { el, cfg } = entry
  el.classList.add('dwell-active')
  const st: { charge: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null } = {
    charge: null, repeat: null
  }
  // 드웰: 게이지 충전(dwellMs) 후 발동. 활성화 모드로 분기:
  //  - repeat: 1차 발동 후 응시 유지(이탈까지) repeatMs 간격 반복 → 스크롤용
  //  - single: 1회만 발동 후 정지. 재발동하려면 이탈 후 재진입 → 이산 키 입력용
  st.charge = setTimeout(() => {
    fireButton(cfg, el)
    el.classList.add('dwell-armed')
    if (settings?.repeatMode === 'repeat') {
      st.repeat = setInterval(() => fireButton(cfg, el), settings?.repeatMs ?? 250)
    }
  }, settings?.dwellMs ?? 700)
  dwellState.set(id, st)
}

function leaveDwell(id: string): void {
  if (id === EDIT_KEY_ID) { leaveEditCharge(); return }
  const st = dwellState.get(id)
  if (st) {
    if (st.charge) clearTimeout(st.charge)
    if (st.repeat) clearInterval(st.repeat)
    dwellState.delete(id)
  }
  const entry = buttons.get(id)
  if (entry) {
    entry.el.classList.remove('dwell-active')
    entry.el.classList.remove('dwell-armed')
  }
}

function setupDrag(cfg: ButtonConfig, el: HTMLElement): void {
  let drag: { dx: number; dy: number } | null = null

  el.addEventListener('pointerdown', (e) => {
    if (!editMode) return
    const r = el.getBoundingClientRect()
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    dragActive = true
    el.classList.add('dragging')
    el.style.zIndex = String(++zTop)
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  el.addEventListener('pointermove', (e) => {
    if (!drag) return
    let nx = e.clientX - drag.dx
    let ny = e.clientY - drag.dy
    const pw = overlayEl.offsetWidth
    const ph = overlayEl.offsetHeight
    const sz = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--btn-size'))
    nx = Math.max(0, Math.min(nx, pw - sz))
    ny = Math.max(0, Math.min(ny, ph - sz))
    el.style.left = nx + 'px'
    el.style.top = ny + 'px'
    cfg.x = nx
    cfg.y = ny
  })

  el.addEventListener('pointerup', () => {
    if (!drag) return
    drag = null
    dragActive = false
    el.classList.remove('dragging')
    saveButtons()
  })
}

function saveButtons(): void {
  // 종료 버튼(__quit)은 별도 컨트롤 — settings.buttons에 저장하지 않음(저장/삭제 대상 아님)
  const cfgs = Array.from(buttons.values()).map(b => b.cfg).filter(c => c.id !== QUIT_KEY_ID)
  window.api.saveButtons(cfgs)
}

function createButton(cfg: ButtonConfig): HTMLElement {
  const el = document.createElement('div')
  el.className = 'rbtn'
  el.dataset.id = cfg.id
  // 핵심 레이아웃 인라인 (CSS 로드 전 플래시 방지) — opacity/transition은 CSS에 위임
  el.style.cssText = `
    position: absolute;
    left: ${cfg.x}px;
    top: ${cfg.y}px;
    width: var(--btn-size, 60px);
    height: var(--btn-size, 60px);
    border-radius: var(--btn-radius, 50%);
    background: var(--btn-bg, #1e293b);
    color: var(--btn-fg, #e2e8f0);
    border: var(--border-w, 1px) solid var(--border-color, #334155);
    display: grid;
    place-items: center;
    cursor: grab;
    font-size: var(--font-size, 18px);
    font-weight: 600;
    box-shadow: 0 4px 14px rgba(0,0,0,.6);
    pointer-events: auto;
    overflow: hidden;
    user-select: none;
    z-index: 10;
  `
  // 서브라벨: 스크롤 버튼은 현재 언어로, 그 외(커스텀 키)는 저장된 label 사용
  const L = settings ? t(settings.lang) : t('ko')
  const subLabel = cfg.action === 'scroll-up' ? L.scrollUp
    : cfg.action === 'scroll-down' ? L.scrollDown : cfg.label
  el.innerHTML = `
    <span class="fill"></span>
    <span class="glyph">${cfg.glyph}</span>
    <span class="sub-label">${subLabel}</span>
  `

  setupDrag(cfg, el)

  overlayEl.appendChild(el)
  buttons.set(cfg.id, { el, cfg })
  return el
}

// ── 설정 패널 (편집모드에서만 표시. 편집모드는 오버레이가 클릭 가능) ──────────
let panelEl: HTMLElement | null = null

function persist(): void {
  if (settings) window.api.saveSettings(settings)
}

function buildSettingsPanel(): void {
  if (panelEl || !settings) return
  const s = settings
  const L = t(s.lang)  // 현재 언어 문자열 세트. 언어 변경 시 패널을 재생성해 재번역한다.
  const langSeg = LANGS.map((l) =>
    `<button data-val="${l.code}"${l.code === s.lang ? ' class="active"' : ''}>${l.label}</button>`).join('')
  panelEl = document.createElement('div')
  panelEl.id = 'settings-panel'
  panelEl.innerHTML = `
    <div class="sp-title">⚙ ${L.settingsTitle}</div>
    <div class="sp-tabs">
      <button class="sp-tab active" data-tab="behavior">${L.tabBehavior}</button>
      <button class="sp-tab" data-tab="style">${L.tabStyle}</button>
      <button class="sp-tab" data-tab="attach">${L.tabAttach}</button>
    </div>

    <div class="sp-pane active" data-pane="behavior">
      <div class="sp-grid">
        <div class="sp-row sp-wide">
          <label>${L.scrollMethod}</label>
          <div class="sp-seg" data-group="scrollmethod">
            <button data-val="inject">${L.methodInject}</button>
            <button data-val="post">${L.methodPost}</button>
            <button data-val="child">${L.methodChild}</button>
          </div>
        </div>
        <div class="sp-row">
          <label>${L.triggerMode}</label>
          <div class="sp-seg" data-group="trigger">
            <button data-val="dwell">${L.dwell}</button>
            <button data-val="click">${L.click}</button>
          </div>
        </div>
        <div class="sp-row">
          <label>${L.activateMode}</label>
          <div class="sp-seg" data-group="repeat">
            <button data-val="single">${L.single}</button>
            <button data-val="repeat">${L.repeat}</button>
          </div>
        </div>
        <div class="sp-row">
          <label>${L.dwellTime}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-dwell" min="200" max="2000" step="50">
            <input type="number" class="sp-num" id="sp-dwell-n" min="200" max="2000" step="50">
          </div>
        </div>
        <div class="sp-row">
          <label>${L.repeatInterval}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-repeat" min="80" max="800" step="10">
            <input type="number" class="sp-num" id="sp-repeat-n" min="80" max="800" step="10">
          </div>
        </div>
        <div class="sp-row">
          <label>${L.scrollSensitivity}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-scroll" min="1" max="10" step="1">
            <input type="number" class="sp-num" id="sp-scroll-n" min="1" max="10" step="1">
          </div>
        </div>
        <div class="sp-row">
          <label>🔑 ${L.editKeyTime}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-edit" min="1000" max="6000" step="250">
            <input type="number" class="sp-num" id="sp-edit-n" min="1000" max="6000" step="250">
          </div>
        </div>
      </div>
    </div>

    <div class="sp-pane" data-pane="style">
      <div class="sp-grid">
        <div class="sp-row sp-wide">
          <label>${L.language}</label>
          <div class="sp-seg sp-lang" data-group="lang">${langSeg}</div>
        </div>
        <div class="sp-row">
          <label>${L.btnSize}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-size" min="30" max="120" step="5">
            <input type="number" class="sp-num" id="sp-size-n" min="30" max="120" step="5">
          </div>
        </div>
        <div class="sp-row">
          <label>${L.btnShape}</label>
          <div class="sp-seg" data-group="shape">
            <button data-val="50%">${L.shapeRound}</button>
            <button data-val="16px">${L.shapeRounded}</button>
            <button data-val="6px">${L.shapeSquare}</button>
          </div>
        </div>
        <div class="sp-row sp-wide">
          <label>${L.gaugeStyle}</label>
          <div class="sp-seg" data-group="gauge">
            <button data-val="fill">${L.gaugeFill}</button>
            <button data-val="fill-lr">${L.gaugeFillLr}</button>
            <button data-val="circular">${L.gaugeCircular}</button>
            <button data-val="expand">${L.gaugeExpand}</button>
          </div>
        </div>
        <div class="sp-row">
          <label>${L.btnBg}</label>
          <div class="sp-palette" data-prop="btnBg"></div>
        </div>
        <div class="sp-row">
          <label>${L.gaugeColor}</label>
          <div class="sp-palette" data-prop="gaugeColor"></div>
        </div>
        <div class="sp-row">
          <label>${L.btnFg}</label>
          <div class="sp-palette" data-prop="btnFg"></div>
        </div>
        <div class="sp-row">
          <label>${L.borderColor}</label>
          <div class="sp-palette" data-prop="borderColor"></div>
        </div>
        <div class="sp-row">
          <label>${L.borderWidth}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-border" min="0" max="6" step="1">
            <input type="number" class="sp-num" id="sp-border-n" min="0" max="6" step="1">
          </div>
        </div>
        <div class="sp-row">
          <label>${L.opacity}</label>
          <div class="sp-ctl">
            <input type="range" id="sp-op" min="0.2" max="1" step="0.05">
            <input type="number" class="sp-num" id="sp-op-n" min="0.2" max="1" step="0.05">
          </div>
        </div>
      </div>
    </div>

    <div class="sp-pane" data-pane="attach">
      <div class="sp-grid">
        <div class="sp-row sp-wide">
          <label>${L.attachToggle}</label>
          <div class="sp-seg" data-group="attach">
            <button data-val="off">${L.off}</button>
            <button data-val="on">${L.on}</button>
          </div>
        </div>
        <div class="sp-row sp-wide">
          <label>${L.attachAnchor}</label>
          <div class="sp-anchor" data-group="anchor">
            <button data-val="tl">↖</button><button data-val="t">↑</button><button data-val="tr">↗</button>
            <button data-val="l">←</button><button class="mid" disabled>·</button><button data-val="r">→</button>
            <button data-val="bl">↙</button><button data-val="b">↓</button><button data-val="br">↘</button>
          </div>
        </div>
        <div class="sp-row sp-wide">
          <label>${L.attachAllow} <span class="sp-hint">${L.attachAllowHint}</span></label>
          <div class="sp-winlist" id="sp-winlist"></div>
          <button class="sp-refresh" id="sp-winrefresh">↻ ${L.winRefresh}</button>
        </div>
      </div>
    </div>

    <button class="sp-done">${L.done}</button>
    <div class="sp-about">
      <div class="sp-about-row">
        <span id="sp-ver">GazeScroll</span>
        <button class="sp-contact" id="sp-contact">✉ ${L.contact}</button>
      </div>
      <div class="sp-copyright">© 2026 BlinkLabs · MIT</div>
    </div>
  `
  document.body.appendChild(panelEl)
  // 버전은 하드코딩 금지 — package.json → app.getVersion() IPC로 읽어 표시(drift 방지).
  window.api.getVersion().then((v) => {
    const ver = panelEl!.querySelector('#sp-ver')
    if (ver) ver.textContent = `GazeScroll v${v}`
  })
  // 문의 버튼 → 정보(About) 모달. 모달을 #settings-panel의 자식으로 붙여 edit-mode 커서 판정
  // selector('#settings-panel')에 포함시킨다(그래야 클릭 가능). 네이티브 alert 아님 — DOM 모달.
  const modal = document.createElement('div')
  modal.id = 'about-modal'
  modal.style.display = 'none'
  modal.innerHTML = `
    <div class="am-box">
      <div class="am-title"><span id="am-appver">GazeScroll</span>&nbsp;·&nbsp;${L.about}<button class="am-x" id="am-x" title="${L.close}">✕</button></div>
      <div class="am-desc">${L.appDesc}</div>
      <div class="am-rows">
        <div class="am-row"><span class="am-k">${L.homepage}</span><a class="am-link" id="am-home" href="#">github.com/ai-blink/GazeScroll</a></div>
        <div class="am-row"><span class="am-k">${L.email}</span><a class="am-link" id="am-mail" href="#">tia_access@naver.com</a></div>
        <div class="am-row"><span class="am-k">${L.maker}</span><span>BlinkLabs</span></div>
      </div>
      <div class="am-copy">© 2026 BlinkLabs · MIT License</div>
      <div class="am-license">${L.licenseNote}</div>
      <button class="am-ok" id="am-ok">${L.close}</button>
    </div>
  `
  panelEl.appendChild(modal)
  const amVer = modal.querySelector('#am-appver')
  if (amVer) window.api.getVersion().then((v) => { amVer.textContent = `GazeScroll v${v}` })
  const showAbout = (show: boolean): void => { modal.style.display = show ? 'block' : 'none' }
  panelEl.querySelector('#sp-contact')?.addEventListener('click', () => showAbout(true))
  modal.querySelector('#am-ok')?.addEventListener('click', () => showAbout(false))
  modal.querySelector('#am-x')?.addEventListener('click', () => showAbout(false))
  modal.querySelector('#am-home')?.addEventListener('click', (e) => {
    e.preventDefault(); window.api.openExternal('https://github.com/ai-blink/GazeScroll')
  })
  modal.querySelector('#am-mail')?.addEventListener('click', (e) => {
    e.preventDefault(); window.api.openExternal(`mailto:tia_access@naver.com?subject=${encodeURIComponent(L.contactSubject)}`)
  })

  const $ = (sel: string): HTMLElement => panelEl!.querySelector(sel) as HTMLElement

  // 탭 전환: 클릭한 탭의 pane만 표시
  panelEl.querySelectorAll<HTMLElement>('.sp-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab
      panelEl!.querySelectorAll<HTMLElement>('.sp-tab').forEach((t) => t.classList.toggle('active', t === tab))
      panelEl!.querySelectorAll<HTMLElement>('.sp-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === name))
    })
  })

  const syncMode = (): void => {
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="trigger"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.triggerMode)
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="repeat"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.repeatMode)
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="scrollmethod"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.scrollMethod)
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="attach"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === (s.attachMode ? 'on' : 'off'))
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-anchor[data-group="anchor"] button[data-val]').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.attachAnchor)
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="shape"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.btnRadius)
    })
    panelEl!.querySelectorAll<HTMLElement>('.sp-seg[data-group="gauge"] button').forEach((b) => {
      b.classList.toggle('active', b.dataset.val === s.gaugeStyle)
    })
  }
  syncMode()

  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="trigger"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.triggerMode = (b.dataset.val as 'dwell' | 'click')
      syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="repeat"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.repeatMode = (b.dataset.val as 'single' | 'repeat')
      syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="scrollmethod"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.scrollMethod = (b.dataset.val as 'inject' | 'post' | 'child')
      syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="attach"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.attachMode = (b.dataset.val === 'on')
      if (!s.attachMode) restoreButtonPositions()  // 끄면 원래 위치 복원
      syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-anchor[data-group="anchor"] button[data-val]').forEach((b) => {
    b.addEventListener('click', () => {
      s.attachAnchor = (b.dataset.val as Settings['attachAnchor'])
      syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="shape"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.btnRadius = (b.dataset.val as string)
      applySettings(s); syncMode(); persist()
    })
  })
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="gauge"] button').forEach((b) => {
    b.addEventListener('click', () => {
      s.gaugeStyle = (b.dataset.val as Settings['gaugeStyle'])
      applySettings(s); syncMode(); persist()
    })
  })
  // 언어 선택: 클릭 즉시 저장 + 패널 재생성으로 재번역(모든 라벨을 새 언어로).
  panelEl.querySelectorAll<HTMLElement>('.sp-seg[data-group="lang"] button').forEach((b) => {
    b.addEventListener('click', () => setLanguage(b.dataset.val as Lang))
  })

  // 붙일 창 허용 목록: 현재 창 목록을 체크리스트로 보여주고, 체크된 exe만 attachAllow에 저장.
  // 목록이 비면 전체 허용(기존 동작). 창 제목은 textContent로 넣어 HTML 주입 방지.
  const winlist = $('#sp-winlist')
  const renderWinlist = async (): Promise<void> => {
    winlist.textContent = L.winLoading
    let live: Array<{ title: string; className: string; exe: string }> = []
    try { live = await window.api.listWindows() } catch { live = [] }
    // 허용됐지만 지금 실행 중이 아닌 exe도 표시해 체크 해제 가능하게 한다.
    const liveExes = new Set(live.map((w) => w.exe))
    const extra = s.attachAllow.filter((e) => !liveExes.has(e)).map((e) => ({ title: L.winNotRunning, className: '', exe: e }))
    const items = [...live, ...extra]
    winlist.textContent = ''
    if (!items.length) { winlist.textContent = L.winEmpty; return }
    // 네이티브 <table> — 브라우저가 열을 자동 정렬(table-layout:fixed로 폭 고정).
    const table = document.createElement('table')
    table.className = 'sp-wintable'
    const thead = document.createElement('thead')
    const htr = document.createElement('tr')
    ;['✓', L.winColApp, L.winColTitle].forEach((label) => {
      const th = document.createElement('th')
      th.textContent = label
      htr.appendChild(th)
    })
    thead.appendChild(htr)
    table.appendChild(thead)
    const tbody = document.createElement('tbody')
    items.forEach((w) => {
      const tr = document.createElement('tr')
      tr.title = `${w.title} (${w.exe})`  // 잘리면 hover 툴팁으로 전체 표시
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = s.attachAllow.includes(w.exe)
      cb.addEventListener('change', () => {
        if (cb.checked) { if (!s.attachAllow.includes(w.exe)) s.attachAllow.push(w.exe) }
        else { s.attachAllow = s.attachAllow.filter((e) => e !== w.exe) }
        persist()
      })
      const td1 = document.createElement('td'); td1.className = 'sp-win-check'; td1.appendChild(cb)
      const td2 = document.createElement('td'); td2.className = 'sp-win-app'; td2.textContent = w.exe.replace(/\.exe$/i, '')
      const td3 = document.createElement('td'); td3.className = 'sp-win-title'; td3.textContent = w.title
      // 행 아무 곳이나 클릭하면 체크 토글(체크박스 직접 클릭은 기본 동작)
      tr.addEventListener('click', (ev) => {
        if (ev.target === cb) return
        cb.checked = !cb.checked
        cb.dispatchEvent(new Event('change'))
      })
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3)
      tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    winlist.appendChild(table)
  }
  $('#sp-winrefresh').addEventListener('click', () => { renderWinlist() })
  renderWinlist()
  // 색상 팔레트(7색): 배경/게이지/텍스트/테두리색을 스와치로 선택. 클릭 즉시 반영·저장.
  // 어두운 배경 / 흰색 / 빨강 / 앰버 / 초록 / 하늘 / 보라 — 대비·구분이 뚜렷한 대표 7색.
  const PALETTE = [
    '#1e293b', '#f8fafc', '#ef4444', '#f59e0b', '#22c55e', '#0ea5e9', '#a855f7'
  ]
  const COLOR_PROPS: Array<'btnBg' | 'gaugeColor' | 'btnFg' | 'borderColor'> = ['btnBg', 'gaugeColor', 'btnFg', 'borderColor']
  COLOR_PROPS.forEach((prop) => {
    const box = panelEl!.querySelector(`.sp-palette[data-prop="${prop}"]`) as HTMLElement
    box.innerHTML = ''
    PALETTE.forEach((color) => {
      const sw = document.createElement('button')
      sw.className = 'sw'
      sw.style.background = color
      sw.classList.toggle('active', s[prop].toLowerCase() === color)
      sw.addEventListener('click', () => {
        s[prop] = color
        box.querySelectorAll('.sw').forEach((e) => e.classList.remove('active'))
        sw.classList.add('active')
        applySettings(s); persist()
      })
      box.appendChild(sw)
    })
  })

  // 슬라이더 ↔ 숫자입력 양방향 동기화. applyVis=true면 CSS 변수 즉시 반영.
  const pair = (rangeId: string, numId: string, min: number, max: number,
                get: () => number, set: (v: number) => void, applyVis: boolean, after?: () => void): void => {
    const rg = $(rangeId) as HTMLInputElement
    const nm = $(numId) as HTMLInputElement
    const sync = (): void => { rg.value = String(get()); nm.value = String(get()) }
    const commit = (raw: number): void => {
      if (Number.isNaN(raw)) return
      set(Math.min(max, Math.max(min, raw)))
      if (applyVis) applySettings(s)
      after?.()
      persist(); sync()
    }
    rg.addEventListener('input', () => commit(+rg.value))
    nm.addEventListener('input', () => commit(+nm.value))
    sync()
  }
  pair('#sp-size', '#sp-size-n', 40, 120, () => s.btnSize, (v) => { s.btnSize = v }, true)
  pair('#sp-dwell', '#sp-dwell-n', 200, 2000, () => s.dwellMs, (v) => { s.dwellMs = v }, true)
  pair('#sp-repeat', '#sp-repeat-n', 80, 800, () => s.repeatMs, (v) => { s.repeatMs = v }, false)
  pair('#sp-op', '#sp-op-n', 0.2, 1, () => s.restOpacity, (v) => { s.restOpacity = v }, true)
  pair('#sp-border', '#sp-border-n', 0, 6, () => s.borderWidth, (v) => { s.borderWidth = v }, true)
  pair('#sp-scroll', '#sp-scroll-n', 1, 10, () => s.scrollClicks, (v) => { s.scrollClicks = v }, false)
  // 🔑 풀리는 시간: 변경 즉시 편집키의 게이지 애니메이션(--dwell-ms)도 갱신
  pair('#sp-edit', '#sp-edit-n', 1000, 6000, () => s.editHoldMs, (v) => { s.editHoldMs = v }, false,
    () => editKeyEl?.style.setProperty('--dwell-ms', s.editHoldMs + 'ms'))

  $('.sp-done').addEventListener('click', () => applyEditMode(false))

  // 패널 자체를 제목 바(⚙ 설정)로 드래그 이동. right 기준 → left/top 기준으로 전환.
  const title = $('.sp-title')
  title.style.cursor = 'move'
  let pdrag: { dx: number; dy: number } | null = null
  title.addEventListener('pointerdown', (e: PointerEvent) => {
    const r = panelEl!.getBoundingClientRect()
    panelEl!.style.right = 'auto'
    panelEl!.style.left = r.left + 'px'
    panelEl!.style.top = r.top + 'px'
    pdrag = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    dragActive = true
    title.setPointerCapture(e.pointerId)
    e.preventDefault()
  })
  title.addEventListener('pointermove', (e: PointerEvent) => {
    if (!pdrag) return
    panelEl!.style.left = (e.clientX - pdrag.dx) + 'px'
    panelEl!.style.top = (e.clientY - pdrag.dy) + 'px'
  })
  title.addEventListener('pointerup', (e: PointerEvent) => {
    if (!pdrag) return
    pdrag = null
    dragActive = false
    title.releasePointerCapture(e.pointerId)
  })
}

function showSettingsPanel(show: boolean): void {
  if (show) buildSettingsPanel()
  if (panelEl) panelEl.style.display = show ? 'block' : 'none'
}

// 스크롤 버튼의 서브라벨(스크롤↑/↓)을 현재 언어로 갱신. 커스텀 키 버튼은 저장된 label 유지.
// (🔑·⏻ 버튼은 sub-label span이 없어 자동 skip)
function applyButtonLabels(): void {
  if (!settings) return
  const L = t(settings.lang)
  for (const { el, cfg } of buttons.values()) {
    const sub = el.querySelector('.sub-label')
    if (!sub) continue
    sub.textContent = cfg.action === 'scroll-up' ? L.scrollUp
      : cfg.action === 'scroll-down' ? L.scrollDown : cfg.label
  }
}

// 언어 변경: 저장 + 버튼 라벨 갱신 + 패널을 재생성해 전체 재번역. 선택 UI가 [모양] 탭에
// 있으므로 재생성 후 그 탭을 활성화해 사용자가 방금 고른 위치를 유지한다.
function setLanguage(lang: Lang): void {
  if (!settings || settings.lang === lang) return
  settings.lang = lang
  document.documentElement.lang = lang
  applyButtonLabels()
  persist()
  if (panelEl) { panelEl.remove(); panelEl = null }
  buildSettingsPanel()  // panelEl을 새로 할당(TS는 이 재할당을 추적 못 해 아래에서 캐스트)
  const p = panelEl as HTMLElement | null
  if (p) {
    p.style.display = 'block'
    const styleTab = p.querySelector('.sp-tab[data-tab="style"]') as HTMLElement | null
    styleTab?.click()
  }
}

// 편집모드 적용 공통 경로 — Alt+E(main) / 🔑 길게응시 / 패널 '편집 완료' 모두 여기로.
function applyEditMode(enabled: boolean): void {
  if (editMode === enabled) return
  editMode = enabled
  document.body.classList.toggle('edit', editMode)
  if (enabled) {
    leaveEditCharge()
    editKeyCharging = false
    if (currentHoverId) { leaveDwell(currentHoverId); currentHoverId = null }
    showSettingsPanel(true)
  } else {
    showSettingsPanel(false)
    setIgnore(true)  // 일반 복귀: 클릭스루 복원
  }
  window.api.setEditMode(editMode)  // main에 동기화(ignoreMouse 토글)
}

// Alt+E는 main에서 처리 → IPC 수신 시 공통 경로로
window.api.onSetEditMode((enabled: boolean) => applyEditMode(enabled))

function applySettings(s: Settings): void {
  const root = document.documentElement
  root.lang = s.lang  // <html lang> 갱신(접근성·폰트 힌트)
  // 모든 CSS 변수 강제 설정 (CSS 파일 로드 실패 시도 보장). 색·테두리는 사용자 설정값.
  root.style.setProperty('--btn-bg', s.btnBg)
  root.style.setProperty('--btn-fg', s.btnFg)
  root.style.setProperty('--border-w', s.borderWidth + 'px')
  root.style.setProperty('--border-color', s.borderColor)
  root.style.setProperty('--btn-size', s.btnSize + 'px')
  root.style.setProperty('--btn-radius', s.btnRadius)
  root.style.setProperty('--rest-op', String(s.restOpacity))
  root.style.setProperty('--hover-op', '1')
  root.style.setProperty('--dwell-ms', s.dwellMs + 'ms')
  root.style.setProperty('--font-size', s.fontSize + 'px')
  root.style.setProperty('--gauge', s.gaugeColor)
  root.style.setProperty('--btn-gap', '12px')
  // 게이지 스타일별 body 클래스 부여(style.css의 gauge-* 규칙 적용). 기존 클래스는 모두 제거 후 현재 것만.
  document.body.classList.remove('gauge-fill', 'gauge-fill-lr', 'gauge-circular', 'gauge-expand')
  document.body.classList.add('gauge-' + s.gaugeStyle)
  // 버튼 모양 클래스 — circular 게이지가 모양(원형/둥근/각진)에 맞춰 도넛/링을 고르게 한다
  document.body.classList.remove('shape-circle', 'shape-rounded', 'shape-square')
  document.body.classList.add(s.btnRadius === '50%' ? 'shape-circle' : s.btnRadius === '6px' ? 'shape-square' : 'shape-rounded')
}

// 🔑 편집키 버튼: 오버레이 우상단 고정. 일반 모드에서 3초 응시 시 편집모드 진입.
// settings.buttons에 넣지 않으므로 저장/삭제/드래그 대상이 아님(별도 컨트롤).
function createEditKey(): void {
  const el = document.createElement('div')
  el.className = 'rbtn edit-key'
  el.dataset.id = EDIT_KEY_ID
  el.style.cssText = `
    position: absolute;
    bottom: 18px;
    left: 20%;
    width: calc(var(--btn-size, 60px) * 0.7);
    height: calc(var(--btn-size, 60px) * 0.7);
    border-radius: var(--btn-radius, 50%);
    background: #422006;
    color: #fbbf24;
    border: 1px solid #b45309;
    display: grid;
    place-items: center;
    font-size: calc(var(--font-size, 18px) * 0.85);
    box-shadow: 0 4px 14px rgba(0,0,0,.6);
    pointer-events: auto;
    overflow: hidden;
    user-select: none;
    z-index: 10;
    --dwell-ms: ${settings?.editHoldMs ?? EDIT_HOLD_MS}ms;
  `
  el.innerHTML = `
    <span class="fill"></span>
    <span class="glyph">🔑</span>
  `
  // 저장된 위치가 있으면 좌상단 px 기준으로 배치 (기본은 좌하단 bottom/left:20%)
  if (settings?.editKey) {
    el.style.bottom = 'auto'
    el.style.left = settings.editKey.x + 'px'
    el.style.top = settings.editKey.y + 'px'
  }

  // 편집모드에서 드래그 이동(위치는 settings.editKey에 저장)
  let kdrag: { dx: number; dy: number } | null = null
  el.addEventListener('pointerdown', (e) => {
    if (!editMode) return
    const r = el.getBoundingClientRect()
    el.style.bottom = 'auto'
    el.style.left = r.left + 'px'
    el.style.top = r.top + 'px'
    kdrag = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    dragActive = true
    el.classList.add('dragging')
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  })
  el.addEventListener('pointermove', (e) => {
    if (!kdrag) return
    const w = el.offsetWidth, h = el.offsetHeight
    const nx = Math.max(0, Math.min(e.clientX - kdrag.dx, overlayEl.offsetWidth - w))
    const ny = Math.max(0, Math.min(e.clientY - kdrag.dy, overlayEl.offsetHeight - h))
    el.style.left = nx + 'px'
    el.style.top = ny + 'px'
  })
  el.addEventListener('pointerup', () => {
    if (!kdrag) return
    kdrag = null
    dragActive = false
    el.classList.remove('dragging')
    if (settings) { settings.editKey = { x: parseInt(el.style.left), y: parseInt(el.style.top) }; persist() }
  })

  overlayEl.appendChild(el)
  editKeyEl = el
}

// ⏻ 종료 버튼: 오버레이 우하단 고정. 작동 방식(dwell 응시 / click 물리클릭)에 맞춰 발동 → 앱 종료.
// buttons Map에 넣어 기존 dwell/click 핸들러가 처리하되, saveButtons에서 제외돼 settings.buttons엔 저장 안 됨.
function createQuitKey(): void {
  const el = document.createElement('div')
  el.className = 'rbtn quit-key'
  el.dataset.id = QUIT_KEY_ID
  el.style.cssText = `
    position: absolute;
    bottom: 18px;
    right: 20%;
    width: calc(var(--btn-size, 60px) * 0.7);
    height: calc(var(--btn-size, 60px) * 0.7);
    border-radius: var(--btn-radius, 50%);
    background: #450a0a;
    color: #fca5a5;
    border: 1px solid #b91c1c;
    display: grid;
    place-items: center;
    font-size: calc(var(--font-size, 18px) * 0.9);
    box-shadow: 0 4px 14px rgba(0,0,0,.6);
    pointer-events: auto;
    overflow: hidden;
    user-select: none;
    z-index: 10;
    --dwell-ms: ${settings?.dwellMs ?? 700}ms;
  `
  el.innerHTML = `
    <span class="fill"></span>
    <span class="glyph">⏻</span>
  `
  const cfg: ButtonConfig = { id: QUIT_KEY_ID, glyph: '⏻', label: t(settings?.lang ?? 'ko').trayQuit, x: 0, y: 0, action: 'quit' }
  overlayEl.appendChild(el)
  buttons.set(QUIT_KEY_ID, { el, cfg })
}

// 붙이기 모드: 대상 창 사각형(오버레이 CSS px)에 스크롤 버튼을 앵커(오른쪽 안쪽, 세로 중앙 스택).
// 창이 이동/리사이즈되면 main 폴링이 rect를 계속 보내 자동 추종. 편집모드이거나 OFF면 무시.
function applyAttach(rx: number, ry: number, rw: number, rh: number): void {
  if (!settings?.attachMode || editMode) return
  const size = settings.btnSize
  const gap = 12
  const inset = 24
  const acts = Array.from(buttons.values()).filter(b => b.cfg.id !== QUIT_KEY_ID)
  if (!acts.length) return
  const totalH = acts.length * size + (acts.length - 1) * gap
  // 앵커 코드 첫글자=세로(t/중/b), 둘째글자=가로(l/중/r). 대상 창(rx,ry,rw,rh) 기준 안쪽 배치.
  const a = settings.attachAnchor
  const isTop = a === 'tl' || a === 't' || a === 'tr'
  const isBot = a === 'bl' || a === 'b' || a === 'br'
  const isLeft = a === 'tl' || a === 'l' || a === 'bl'
  const isRight = a === 'tr' || a === 'r' || a === 'br'
  const x = isLeft ? rx + inset : isRight ? rx + rw - size - inset : rx + rw / 2 - size / 2
  let y = isTop ? ry + inset : isBot ? ry + rh - totalH - inset : ry + rh / 2 - totalH / 2
  for (const { el } of acts) {
    el.style.left = Math.max(0, Math.round(x)) + 'px'
    el.style.top = Math.max(0, Math.round(y)) + 'px'
    y += size + gap
  }
}
window.api.onTargetRect((x, y, w, h) => applyAttach(x, y, w, h))

// 붙이기 해제 시 원래(cfg) 위치로 복원
function restoreButtonPositions(): void {
  for (const { el, cfg } of buttons.values()) {
    if (cfg.id === QUIT_KEY_ID) continue
    el.style.left = cfg.x + 'px'
    el.style.top = cfg.y + 'px'
  }
}

async function init(): Promise<void> {
  try {
    settings = await window.api.getSettings() as Settings
    applySettings(settings)
    for (const cfg of settings.buttons) {
      createButton(cfg)
    }
    createEditKey()
    createQuitKey()
  } catch (e) {
    console.error('[overlay] init error:', e)
  }
}

init()
