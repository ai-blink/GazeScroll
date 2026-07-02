# GazeScroll — 창에 붙는 경량 스크롤 리모컨

Windows 11용 투명 클릭스루 오버레이. 화면에 떠 있는 버튼을 **응시(dwell)**하면 아래 앱(포그라운드 창)을 스크롤하거나 키를 입력한다. 안구마우스(시선 추적) 등 제한된 입력 환경의 접근성 보조가 목표다.

overlay-remote에서 **"dwell 스크롤 + 창 붙이기(자동 추종)"**만 뽑아낸 전용 경량 앱이다. 실험 도구(probe·F5)를 걷어내고, 버튼을 대상 창에 자동으로 붙이는 **붙이기**와 특정 창만 따라가게 하는 **붙일 창 허용 목록**을 더했다.

## 주요 기능

- **dwell(응시) 발동** — 버튼에 커서를 올려 700ms 응시하면 스크롤/키 발동. 물리 클릭이 없어 "클릭 뚫림" 문제가 없다(크롬 포함 전 앱 안정). 응시 게이지(채움/원형)로 충전 상태를 시각화.
- **창 붙이기(자동 추종)** — 스크롤 버튼 그룹이 대상 창에 앵커되어 창 이동/리사이즈를 따라간다. 안구마우스 정밀 드래그 부담을 없애고, `inject` 스크롤이 늘 대상 창 콘텐츠 위에 놓이게 한다. 붙는 위치는 대상 창 기준 8분할(모서리·변)로 선택.
- **붙일 창 허용 목록** — 현재 창 목록(EnumWindows) 중 체크한 앱(exe명)만 추종. 다른 창을 포커스해도 지정한 창을 계속 따라간다. 비워두면 전체 허용(기존 동작).
- **단순한 설정** — 탭 3개(동작/모양/붙일 창)로 한눈에. 버튼 크기·모양(원형/둥근/각짐), 게이지 형태, 7색 팔레트.
- **키보드 없이 조작** — 화면의 🔑 편집키(3초 응시)·⏻ 종료 버튼으로 마우스/시선만으로 편집·종료.

## 실행

```bash
npm install
npm run dev      # 개발 (electron-vite dev)
npm run build    # 프로덕션 빌드 (타입체크 포함, 단 느슨함 — npx tsc --noEmit 별도 권장)
npm run dist     # 배포 산출물 빌드 (electron-builder → dist-release/*.zip)
npm run rebuild  # koffi 네이티브 모듈 재빌드 (Electron ABI 불일치 시)
```

트레이에 상주한다. 창을 닫아도 종료되지 않으며, 종료는 ⏻ 버튼 또는 트레이 메뉴로 한다.

## 조작

| 동작 | 방법 |
|------|------|
| 스크롤/키 발동 | 버튼에 커서를 올려 **700ms 응시**(dwell) → 발동. 응시 유지 시 250ms마다 반복 |
| 편집 모드(버튼 이동/삭제, 설정) | **Alt+E** 토글, 또는 화면 우상단 **🔑 편집키를 3초 응시** → 진입. 다시 Alt+E 또는 패널의 "편집 완료"로 복귀(자동 저장) |
| 오버레이 표시/숨김 | **Alt+F12** 또는 트레이 아이콘 클릭 |
| 종료 | 화면 우하단 **⏻ 버튼** 발동, 또는 트레이 우클릭 → 종료 |

> 작동 방식은 설정에서 바꿀 수 있다: `triggerMode` = dwell(응시) / click(실제 클릭), `repeatMode` = single(단발) / repeat(뗄 때까지 반복). 두 축은 직교한다.

설정은 `%APPDATA%/gazescroll/gazescroll/settings.json`에 저장된다. 삭제하면 기본값(화면 중앙 ▲▼ 2버튼)으로 초기화된다.

## 설정 패널 (편집 모드에서만 표시, 3탭)

- **동작** — triggerMode(dwell/click) · repeatMode(single/repeat) · scrollMethod(auto/post/child/inject) · dwellMs · 🔑 풀리는 시간(편집 진입 응시 시간).
- **모양** — 버튼 크기 · 버튼 모양(원형/둥근/각짐) · dwell 게이지 형태(채움/원형) · **7색 팔레트**(배경·게이지·텍스트·테두리) · 테두리 굵기 · **붙는 위치 8분할 앵커**.
- **붙일 창** — 현재 창 체크리스트(제목+앱 exe명). 체크한 창만 추종한다. 비우면 전체 허용.

## 구조

```
src/
  main/
    index.ts      메인 프로세스 — 오버레이 창, 트레이, 전역 단축키, IPC, 50ms 커서/대상창 폴링
    input.ts      koffi FFI (user32.dll / kernel32.dll) — 스크롤·키 합성, 커서/버튼상태 read,
                  대상창 lock, 창 목록(EnumWindows)+exe명 조회
    settings.ts   Settings 타입·기본값·load/save (userData 병합)
  preload/index.ts  contextBridge IPC 브리지 (window.api — 로직 없음)
  renderer/src/
    main.ts       버튼 렌더링, dwell/click 판정, 드래그 편집, 붙이기(applyAttach),
                  설정 패널(3탭), 붙일 창 목록(네이티브 <table>)
    style.css     버튼·게이지(채움/원형 conic-gradient)·설정 패널·창 목록 스타일
electron-builder.yml   zip 타깃 + requireAdministrator + koffi asarUnpack
```

의존성 규칙: renderer는 main 함수를 직접 import하지 않고 preload `window.api` IPC만 쓴다. input.ts는 electron을 import하지 않는 순수 Win32 FFI다.

## 핵심 1: 스크롤 입력 처리 (앱마다 휠 받는 법이 다름)

전역 스크롤은 단순하지 않다. 앱마다 합성 휠을 받는 방식이 **정반대**라서 대상 창 클래스로 경로를 분기한다(`index.ts`의 `scroll` IPC → `input.ts`).

| 방식 | 대상 | 구현 | 함수 |
|------|------|------|------|
| **post** | 크롬류 Chromium (크롬/Edge/Electron) | top-level 창에 `PostMessage(WM_MOUSEWHEEL)` | `scrollPostTop` |
| **child** | 클래식 Win32 (메모장·터미널·카톡 등) | 자식 컨트롤(Edit 등)에 `PostMessage(WM_MOUSEWHEEL)` | `scrollPost` |
| **inject** | PostMessage 무시 앱 / 휴대폰 원격제어 | `SendInput`으로 실제 OS 휠 입력 (커서 위치 그대로) | `scrollInject` |
| **auto**(기본) | 대상 클래스로 자동 선택 | `Chrome_WidgetWin*` → post, 그 외 → child | — |

### 왜 분기가 필요한가 (디버깅 결론)

- **Chromium은 합성 `PostMessage`를 자식(`Chrome_RenderWidgetHostHWND`)에 보내면 무시**하지만, **top-level(`Chrome_WidgetWin_*`)에 보내면** 자체 hit-test로 처리한다(FlowType OSK가 실사용으로 입증). → `post`. 커서 불변.
- **클래식 Win32(메모장)는 `SendInput` 휠을 잘 안 먹고 `PostMessage`는 받는다.** 단 실제 휠을 처리하는 건 top-level이 아닌 자식 컨트롤이라 `ChildWindowFromPointEx`로 가장 깊은 자식까지 내려가 보낸다. → `child`. 커서 불변.
- **`inject`(SendInput 실제 휠)는 커서를 옮기지 않는다.** 오버레이가 클릭스루(`WS_EX_TRANSPARENT`)라 휠이 버튼 아래 대상 창으로 통과하므로, **버튼(=응시 지점)이 대상 창 콘텐츠 위에 있으면** 그 창이 스크롤된다. (조이마우스/AltController와 동일 — 커서 이동 시 "이동 지점에 다른 창" 오작동을 유발하므로 이동하지 않는다.)

### 대상 창 lock + 좌클릭 freeze

클릭이 포그라운드를 안구 SW·시스템 창으로 잠깐 튀게 하므로, 폴링으로 **마지막 비-오버레이 포그라운드 창**(`lockedTargetHwnd`)을 기억해두고 거기에 스크롤을 보낸다. 좌클릭이 눌린 동안은 lock 갱신을 동결해 직전 작업 창을 유지한다. 오버레이 자신이 포그라운드일 땐 갱신하지 않는다(자기 창 스크롤 방지).

## 핵심 2: 붙이기(자동 추종) + 붙일 창 허용 목록

- **붙이기**: `attachMode` ON이면 `input.ts getTargetRect()`(lock된 대상 창의 `GetWindowRect`)를 `index.ts` 폴링이 오버레이 CSS px로 변환해 `target-rect`로 renderer에 보내고, `applyAttach`가 `attachAnchor`(8분할)에 맞춰 버튼 그룹을 대상 창에 앵커한다. 편집 모드 중엔 정지.
- **붙일 창 허용 목록**: `input.ts listWindows()`가 `EnumWindows`로 보이는·제목 있는 top-level 창을 열거하고, `kernel32`(`OpenProcess`/`QueryFullProcessImageNameW`)로 소유 프로세스 **exe명**을 조회한다(앱 1개=1행, exe 기준 중복 제거). HWND는 세션마다 바뀌므로 허용 목록은 **exe명**으로 영속화(`attachAllow: string[]`). `index.ts` 폴링이 포그라운드 exe가 허용 목록에 있을 때만 lock을 갱신 → 다른 창을 포커스해도 지정한 창을 계속 추종. 목록이 비면 전체 허용.

## 핵심 3: hover 판정은 전역 커서 폴링

오버레이는 **항상 클릭스루**(`setIgnoreMouseEvents(true, {forward})`)여야 휠이 그 아래 대상 창에 닿는다. Electron의 `forward` mousemove는 창이 포커스를 가질 때만 오는데 오버레이는 `showInactive`로 포커스가 없다. 그래서 hover/dwell 판정은 main에서 `GetCursorPos`를 50ms 폴링해 좌표를 renderer로 보내 처리한다(AltController 방식). 창은 `focusable:false` + `showInactive()`로 포커스/포그라운드를 절대 탈취하지 않는다(편집 모드에서만 일시 focusable).

## 배포

```bash
npm run dist   # → dist-release/GazeScroll-<ver>-win.zip
```

압축을 풀고 `GazeScroll.exe`를 실행한다(설치 불필요).

- **zip 타깃 + `requireAdministrator`**: portable 타깃은 실행 수준(requestedExecutionLevel)을 못 실어 실행에 실패하는 이슈(electron-builder #7566)가 있어 zip을 쓴다. koffi 네이티브 바인딩은 asar 밖으로 풀어야 로드되므로 `asarUnpack` 필수.
- **관리자 실행이 필요한 경우**: 휴대폰 원격제어 등 **고무결성/보호 표면**은 일반 권한의 `SendInput`이 UIPI에 막혀 조용히 버려진다. `requireAdministrator`로 앱을 고무결성으로 승격해야 합성 휠이 그 창에 전달된다. UAC "알림 안 함" 환경(안구마우스 PC)에선 프롬프트 없이 자동 승격된다.
- **inject(실휠) 사용 규칙**: ① 관리자 실행(고무결성) + ② 버튼을 대상 창 콘텐츠 위에(붙이기로 자동 유지). 두 조건이 동시에 충족돼야 원격제어 창이 스크롤된다.

> 정식 배포 경로(후속): `uiAccess=true` 매니페스트(코드서명 + Program Files 설치 필요)로 관리자 없이 고무결성 창에 입력. 현재는 requireAdministrator 방식.

## 참고 (레퍼런스 구현)

스크롤 입력 처리 패턴의 출처(둘 다 커서 불변):

- **key-demo-osk** (FlowType OSK, C# WPF) — `PostScrollWheel`: 포그라운드 창에 PostMessage.
- **AltController** ([Tim-Brogden/AltController](https://github.com/Tim-Brogden/AltController), 조이마우스, C# WPF) — 커서 위치 SendInput, 오버레이 항상 클릭스루 + 커서 폴링.

## 알려진 제약

- **클릭 모드 + 크롬**: Chromium이 흡수(마우스 캡처) 중 합성 휠을 거부해, click 모드에서 "안 뚫림 + 스크롤" 동시 달성은 크롬만 불가. **주력인 dwell 모드는 정상 동작**하므로 실사용 영향은 없다.
- **관리자 권한**: 관리자로 실행된 앱/보호 표면은 일반 권한 오버레이의 입력이 UIPI로 차단될 수 있다(→ 관리자 실행).

## 라이선스

MIT © 2026 BlinkLabs &lt;tia_access@naver.com&gt;

자세한 내용은 [LICENSE](./LICENSE) 참조.
