import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  setIgnoreMouse: (ignore: boolean) =>
    ipcRenderer.send('set-ignore-mouse', ignore),

  scroll: (dir: 'up' | 'down', screenX: number, screenY: number) =>
    ipcRenderer.send('scroll', dir, screenX, screenY),

  keyPress: (vk: number, scan: number, scanMode: boolean) =>
    ipcRenderer.send('key-press', vk, scan, scanMode),

  saveButtons: (buttons: unknown[]) =>
    ipcRenderer.send('save-buttons', buttons),

  getSettings: (): Promise<unknown> =>
    ipcRenderer.invoke('get-settings'),

  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-version'),

  openExternal: (url: string) =>
    ipcRenderer.send('open-external', url),

  // 붙일 창 허용 목록 UI: 현재 보이는 창 목록(제목·클래스·exe명)
  listWindows: (): Promise<Array<{ title: string; className: string; exe: string }>> =>
    ipcRenderer.invoke('list-windows'),

  saveSettings: (settings: unknown) =>
    ipcRenderer.send('save-settings', settings),

  toggleOverlay: () =>
    ipcRenderer.send('toggle-overlay'),

  setEditMode: (enabled: boolean) =>
    ipcRenderer.send('set-edit-mode', enabled),

  onSetEditMode: (callback: (enabled: boolean) => void) =>
    ipcRenderer.on('set-edit-mode', (_e, enabled) => callback(enabled)),

  onCursor: (callback: (x: number, y: number, pressed: boolean, targetIsChrome: boolean) => void) =>
    ipcRenderer.on('cursor', (_e, x, y, pressed, targetIsChrome) => callback(x, y, pressed, targetIsChrome)),

  // 붙이기 모드: 대상 창 사각형(오버레이 기준 CSS px)
  onTargetRect: (callback: (x: number, y: number, w: number, h: number) => void) =>
    ipcRenderer.on('target-rect', (_e, x, y, w, h) => callback(x, y, w, h)),

  quit: () => ipcRenderer.send('quit'),
})
