import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { Lang } from '../shared/i18n'

export interface ButtonConfig {
  id: string
  glyph: string
  label: string
  x: number
  y: number
  action: 'scroll-up' | 'scroll-down' | 'key'
  vk?: number
  scan?: number
  scanMode?: boolean
}

export interface Settings {
  buttons: ButtonConfig[]
  dwellMs: number
  restOpacity: number
  hoverOpacity: number
  btnSize: number
  btnRadius: string        // 버튼 모양: 원형('50%')/둥근('16px')/각짐('6px')
  gaugeStyle: 'fill' | 'fill-lr' | 'circular' | 'expand'  // dwell 게이지 형태:
  // fill=채움(아래→위) / fill-lr=채움(왼→오) / circular=원형 링(도넛 스윕) / expand=확산(가운데 작은 점→커지며 채움)
  gaugeColor: string       // 게이지(dwell 충전) 색
  btnBg: string            // 버튼 배경색
  btnFg: string            // 버튼 텍스트/글리프 색
  borderWidth: number      // 테두리 굵기(px)
  borderColor: string      // 테두리 색
  fontSize: number
  triggerMode: 'dwell' | 'click'   // 작동 방식: 응시 게이지 / 실제 클릭
  repeatMode: 'single' | 'repeat'  // 활성화 모드: 단발 / 반복(뗄 때까지)
  repeatMs: number
  scrollClicks: number
  scrollMethod: 'inject' | 'post' | 'child'  // 스크롤 방식(기본 inject):
  // inject=SendInput 실제 물리휠(기본 — 부착이 버튼을 대상 창 위에 유지→앱 안 가리고 다 됨) / post=top-level PostMessage(크롬 등) / child=자식 컨트롤 PostMessage(메모장 등 클래식)
  editKey: { x: number; y: number } | null  // 🔑 편집키 위치(null=기본 좌하단)
  editHoldMs: number  // 🔑 편집 진입까지 길게 누름/응시 시간
  attachMode: boolean  // 붙이기: 스크롤 버튼이 대상 창을 자동 추종(창 이동/리사이즈 따라감)
  attachAnchor: 'tl' | 't' | 'tr' | 'l' | 'r' | 'bl' | 'b' | 'br'  // 붙는 위치(대상 창 기준 8분할)
  attachAllow: string[]  // 붙일 창 허용 목록(exe명, 소문자). 비어 있으면 전체 허용(기본)
  globalHotkey: string
  showOverlay: boolean
  lang: Lang  // UI 언어(ko/en/ja/zh-CN/zh-TW/hi/es). 기본 ko.
}

function computeDefaultButtons(screenWidth: number, screenHeight: number): ButtonConfig[] {
  const btnSize = 60
  const gap = 12
  const x = Math.round(screenWidth * 0.5)  // 화면 가로 중앙
  const yBase = screenHeight - 60 - btnSize  // 태스크바(~60px) 위 첫 버튼 위치
  return [
    { id: 'scroll-up', glyph: '▲', label: '스크롤↑', x, y: yBase - (btnSize + gap), action: 'scroll-up' },
    { id: 'scroll-down', glyph: '▼', label: '스크롤↓', x, y: yBase, action: 'scroll-down' }
  ]
}

const DEFAULT_SETTINGS: Settings = {
  buttons: [
    { id: 'scroll-up', glyph: '▲', label: '스크롤↑', x: 960, y: 888, action: 'scroll-up' },
    { id: 'scroll-down', glyph: '▼', label: '스크롤↓', x: 960, y: 960, action: 'scroll-down' }
  ],
  dwellMs: 700,
  restOpacity: 0.55,
  hoverOpacity: 1.0,
  btnSize: 60,
  btnRadius: '50%',
  gaugeStyle: 'fill',
  gaugeColor: '#38bdf8',
  btnBg: '#1e293b',
  btnFg: '#e2e8f0',
  borderWidth: 1,
  borderColor: '#334155',
  fontSize: 18,
  triggerMode: 'dwell',
  repeatMode: 'repeat',
  repeatMs: 250,
  scrollClicks: 3,
  scrollMethod: 'inject',   // 기본=실제 물리휠(부착이 버튼을 대상 창 위에 유지 → 앱 안 가리고 다 됨). auto/post/child는 폴백으로 선택 가능
  editKey: null,
  editHoldMs: 3000,
  attachMode: false,
  attachAnchor: 'r',
  attachAllow: [],
  globalHotkey: 'Alt+F12',
  showOverlay: true,
  lang: 'ko'
}

function getSettingsPath(): string {
  const dir = join(app.getPath('userData'), 'gazescroll')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

export function loadSettings(screenWidth?: number, screenHeight?: number): Settings {
  try {
    const p = getSettingsPath()
    if (!existsSync(p)) {
      const s = { ...DEFAULT_SETTINGS }
      if (screenWidth && screenHeight) s.buttons = computeDefaultButtons(screenWidth, screenHeight)
      return s
    }
    const raw = readFileSync(p, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    const s = { ...DEFAULT_SETTINGS }
    if (screenWidth && screenHeight) s.buttons = computeDefaultButtons(screenWidth, screenHeight)
    return s
  }
}

export function saveSettings(s: Settings): void {
  try {
    writeFileSync(getSettingsPath(), JSON.stringify(s, null, 2), 'utf-8')
  } catch (e) {
    console.error('saveSettings error:', e)
  }
}
