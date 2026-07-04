// 다국어 문자열 사전 (main·renderer 공용). 로케일별로 같은 키 집합을 채운다.
// 기호(⚙ 🔑 ✉ ⏻ ↻ ✓)와 고유명(GazeScroll·MIT·BlinkLabs)은 템플릿에 두고 여기선 텍스트만 번역.

export type Lang = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'hi' | 'es'

// 언어 선택 세그먼트에 표시할 이름(엔도님 — 현재 언어와 무관하게 각 언어의 자기 이름)
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-CN', label: '简体' },
  { code: 'zh-TW', label: '繁體' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' }
]

export interface Strings {
  // 패널 제목·탭
  settingsTitle: string
  tabBehavior: string
  tabStyle: string
  tabAttach: string
  // 동작 탭
  triggerMode: string
  dwell: string
  click: string
  activateMode: string
  single: string
  repeat: string
  dwellTime: string
  repeatInterval: string
  scrollSensitivity: string
  scrollMethod: string
  methodPost: string
  methodChild: string
  methodInject: string
  editKeyTime: string
  // 모양 탭
  btnSize: string
  btnShape: string
  shapeRound: string
  shapeRounded: string
  shapeSquare: string
  gaugeStyle: string
  gaugeFill: string
  gaugeFillLr: string
  gaugeCircular: string
  gaugeExpand: string
  btnBg: string
  gaugeColor: string
  btnFg: string
  borderColor: string
  borderWidth: string
  opacity: string
  language: string
  // 붙일 창 탭
  attachToggle: string
  off: string
  on: string
  attachAnchor: string
  filterModeLabel: string   // 창 필터 방식 라벨
  filterAllow: string       // 허용 모드 세그먼트
  filterBlock: string       // 차단 모드 세그먼트
  filterAllowDesc: string   // 허용 모드 목록 설명(체크=이 창들만)
  filterBlockDesc: string   // 차단 모드 목록 설명(체크=이 창들 제외)
  attachAllow: string
  attachAllowHint: string
  winRefresh: string
  // 하단·창목록
  done: string
  contact: string
  maker: string        // 제작자 라벨
  licenseNote: string  // MIT 라이선스 한 줄 설명
  // 정보(About) 모달
  about: string        // 모달 제목의 "정보"
  homepage: string
  email: string
  appDesc: string      // 앱 한 줄 소개
  close: string        // 확인 버튼
  winLoading: string
  winEmpty: string
  winNotRunning: string
  winColApp: string
  winColTitle: string
  contactSubject: string
  // 버튼 서브라벨
  scrollUp: string
  scrollDown: string
  // 트레이(main)
  trayToggle: string
  trayQuit: string
  trayTooltip: string
}

const ko: Strings = {
  settingsTitle: '설정',
  tabBehavior: '동작',
  tabStyle: '모양',
  tabAttach: '붙일 창',
  triggerMode: '작동 방식',
  dwell: '드웰',
  click: '클릭',
  activateMode: '활성화 모드',
  single: '단발',
  repeat: '반복',
  dwellTime: '드웰 시간 (ms)',
  repeatInterval: '반복 간격 (ms)',
  scrollSensitivity: '스크롤 감도 (휠 노치)',
  scrollMethod: '스크롤 방식',
  methodPost: '크롬형',
  methodChild: '클래식',
  methodInject: '실제 물리휠',
  editKeyTime: '풀리는 시간 (ms)',
  btnSize: '버튼 크기 (px)',
  btnShape: '버튼 모양',
  shapeRound: '원형',
  shapeRounded: '둥근',
  shapeSquare: '각짐',
  gaugeStyle: '드웰 게이지 형태',
  gaugeFill: '채움↑',
  gaugeFillLr: '채움→',
  gaugeCircular: '원형',
  gaugeExpand: '확산',
  btnBg: '버튼 배경색',
  gaugeColor: '게이지 색',
  btnFg: '텍스트 색',
  borderColor: '테두리 색',
  borderWidth: '테두리 굵기 (px)',
  opacity: '투명도',
  language: '언어',
  attachToggle: '창에 붙이기 (자동 추종)',
  off: '끄기',
  on: '켜기',
  attachAnchor: '붙는 위치 (대상 창 기준)',
  filterModeLabel: '창 필터 방식',
  filterAllow: '허용 모드',
  filterBlock: '차단 모드',
  filterAllowDesc: '체크한 창에서만 작동',
  filterBlockDesc: '체크한 창만 제외',
  attachAllow: '붙일 창 허용 목록',
  attachAllowHint: '(비우면 전체 허용)',
  winRefresh: '목록 새로고침',
  done: '편집 완료',
  contact: '문의',
  maker: '제작자',
  licenseNote: 'MIT 라이선스 — 자유롭게 사용·수정·재배포 가능 (저작권 고지 유지)',
  about: '정보',
  homepage: '홈페이지',
  email: '이메일',
  appDesc: '안구마우스·시선추적 접근성용 전역 스크롤 리모컨. 화면 버튼을 응시(dwell)하면 포그라운드 앱이 스크롤됩니다.',
  close: '확인',
  winLoading: '불러오는 중…',
  winEmpty: '창을 찾지 못했습니다',
  winNotRunning: '(실행 중 아님)',
  winColApp: '앱',
  winColTitle: '창 제목',
  contactSubject: 'GazeScroll 문의',
  scrollUp: '스크롤↑',
  scrollDown: '스크롤↓',
  trayToggle: '토글 표시/숨김',
  trayQuit: '종료',
  trayTooltip: 'GazeScroll — 전역 스크롤 리모컨'
}

const en: Strings = {
  settingsTitle: 'Settings',
  tabBehavior: 'Behavior',
  tabStyle: 'Style',
  tabAttach: 'Attach',
  triggerMode: 'Trigger',
  dwell: 'Dwell',
  click: 'Click',
  activateMode: 'Activation',
  single: 'Single',
  repeat: 'Repeat',
  dwellTime: 'Dwell time (ms)',
  repeatInterval: 'Repeat interval (ms)',
  scrollSensitivity: 'Scroll amount (notches)',
  scrollMethod: 'Scroll method',
  methodPost: 'Chrome',
  methodChild: 'Classic',
  methodInject: 'Real wheel',
  editKeyTime: 'Unlock time (ms)',
  btnSize: 'Button size (px)',
  btnShape: 'Button shape',
  shapeRound: 'Round',
  shapeRounded: 'Rounded',
  shapeSquare: 'Square',
  gaugeStyle: 'Dwell gauge',
  gaugeFill: 'Fill↑',
  gaugeFillLr: 'Fill→',
  gaugeCircular: 'Ring',
  gaugeExpand: 'Expand',
  btnBg: 'Button color',
  gaugeColor: 'Gauge color',
  btnFg: 'Text color',
  borderColor: 'Border color',
  borderWidth: 'Border width (px)',
  opacity: 'Opacity',
  language: 'Language',
  attachToggle: 'Attach to window (follow)',
  off: 'Off',
  on: 'On',
  attachAnchor: 'Anchor (on target window)',
  filterModeLabel: 'Window filter',
  filterAllow: 'Allow mode',
  filterBlock: 'Block mode',
  filterAllowDesc: 'Follow only checked windows',
  filterBlockDesc: 'Follow all except checked',
  attachAllow: 'Allowed windows',
  attachAllowHint: '(empty = allow all)',
  winRefresh: 'Refresh list',
  done: 'Done',
  contact: 'Contact',
  maker: 'Maker',
  licenseNote: 'MIT License — free to use, modify, and redistribute (keep the copyright notice)',
  about: 'About',
  homepage: 'Homepage',
  email: 'Email',
  appDesc: 'A global scroll remote for eye-tracking accessibility. Dwell on a button and the foreground app scrolls.',
  close: 'OK',
  winLoading: 'Loading…',
  winEmpty: 'No windows found',
  winNotRunning: '(not running)',
  winColApp: 'App',
  winColTitle: 'Window title',
  contactSubject: 'GazeScroll inquiry',
  scrollUp: 'Scroll↑',
  scrollDown: 'Scroll↓',
  trayToggle: 'Show / Hide',
  trayQuit: 'Quit',
  trayTooltip: 'GazeScroll — global scroll remote'
}

const ja: Strings = {
  settingsTitle: '設定',
  tabBehavior: '動作',
  tabStyle: '外観',
  tabAttach: '貼り付け',
  triggerMode: '作動方式',
  dwell: 'ドウェル',
  click: 'クリック',
  activateMode: '実行モード',
  single: '単発',
  repeat: '連続',
  dwellTime: 'ドウェル時間 (ms)',
  repeatInterval: '繰り返し間隔 (ms)',
  scrollSensitivity: 'スクロール量 (ノッチ)',
  scrollMethod: 'スクロール方式',
  methodPost: 'Chrome系',
  methodChild: 'クラシック',
  methodInject: '実ホイール',
  editKeyTime: '解除時間 (ms)',
  btnSize: 'ボタンサイズ (px)',
  btnShape: 'ボタン形状',
  shapeRound: '円形',
  shapeRounded: '角丸',
  shapeSquare: '角形',
  gaugeStyle: 'ゲージ形状',
  gaugeFill: '満ち↑',
  gaugeFillLr: '満ち→',
  gaugeCircular: '円形',
  gaugeExpand: '拡散',
  btnBg: 'ボタン背景色',
  gaugeColor: 'ゲージ色',
  btnFg: '文字色',
  borderColor: '枠線色',
  borderWidth: '枠線の太さ (px)',
  opacity: '不透明度',
  language: '言語',
  attachToggle: 'ウィンドウに貼り付け (追従)',
  off: 'オフ',
  on: 'オン',
  attachAnchor: '貼り付け位置 (対象ウィンドウ基準)',
  filterModeLabel: 'ウィンドウフィルター',
  filterAllow: '許可モード',
  filterBlock: 'ブロックモード',
  filterAllowDesc: 'チェックした窓のみ追従',
  filterBlockDesc: 'チェックした窓を除外',
  attachAllow: '対象ウィンドウ許可リスト',
  attachAllowHint: '(空欄=すべて許可)',
  winRefresh: 'リスト更新',
  done: '編集完了',
  contact: '問い合わせ',
  maker: '制作者',
  licenseNote: 'MITライセンス — 自由に使用・改変・再配布可能（著作権表示を保持）',
  about: '情報',
  homepage: 'ホームページ',
  email: 'メール',
  appDesc: '視線追跡アクセシビリティ用のグローバルスクロールリモコン。ボタンを注視(ドウェル)すると前面のアプリがスクロールします。',
  close: 'OK',
  winLoading: '読み込み中…',
  winEmpty: 'ウィンドウが見つかりません',
  winNotRunning: '(実行していません)',
  winColApp: 'アプリ',
  winColTitle: 'ウィンドウタイトル',
  contactSubject: 'GazeScroll お問い合わせ',
  scrollUp: 'スクロール↑',
  scrollDown: 'スクロール↓',
  trayToggle: '表示 / 非表示',
  trayQuit: '終了',
  trayTooltip: 'GazeScroll — グローバルスクロールリモコン'
}

const zhCN: Strings = {
  settingsTitle: '设置',
  tabBehavior: '动作',
  tabStyle: '外观',
  tabAttach: '吸附窗口',
  triggerMode: '触发方式',
  dwell: '停留',
  click: '点击',
  activateMode: '激活模式',
  single: '单次',
  repeat: '重复',
  dwellTime: '停留时间 (ms)',
  repeatInterval: '重复间隔 (ms)',
  scrollSensitivity: '滚动量 (齿格)',
  scrollMethod: '滚动方式',
  methodPost: 'Chrome型',
  methodChild: '经典',
  methodInject: '真实滚轮',
  editKeyTime: '解锁时间 (ms)',
  btnSize: '按钮大小 (px)',
  btnShape: '按钮形状',
  shapeRound: '圆形',
  shapeRounded: '圆角',
  shapeSquare: '方形',
  gaugeStyle: '停留进度样式',
  gaugeFill: '填充↑',
  gaugeFillLr: '填充→',
  gaugeCircular: '环形',
  gaugeExpand: '扩散',
  btnBg: '按钮背景色',
  gaugeColor: '进度条颜色',
  btnFg: '文字颜色',
  borderColor: '边框颜色',
  borderWidth: '边框粗细 (px)',
  opacity: '不透明度',
  language: '语言',
  attachToggle: '吸附到窗口 (跟随)',
  off: '关',
  on: '开',
  attachAnchor: '吸附位置 (相对目标窗口)',
  filterModeLabel: '窗口过滤方式',
  filterAllow: '允许模式',
  filterBlock: '屏蔽模式',
  filterAllowDesc: '仅跟随勾选的窗口',
  filterBlockDesc: '排除勾选的窗口',
  attachAllow: '允许窗口列表',
  attachAllowHint: '(留空=全部允许)',
  winRefresh: '刷新列表',
  done: '完成编辑',
  contact: '联系',
  maker: '作者',
  licenseNote: 'MIT 许可证 — 可自由使用、修改、再分发（保留版权声明）',
  about: '关于',
  homepage: '主页',
  email: '邮箱',
  appDesc: '面向眼动追踪无障碍的全局滚动遥控器。停留注视按钮即可滚动前台应用。',
  close: '确定',
  winLoading: '加载中…',
  winEmpty: '未找到窗口',
  winNotRunning: '(未运行)',
  winColApp: '应用',
  winColTitle: '窗口标题',
  contactSubject: 'GazeScroll 咨询',
  scrollUp: '滚动↑',
  scrollDown: '滚动↓',
  trayToggle: '显示 / 隐藏',
  trayQuit: '退出',
  trayTooltip: 'GazeScroll — 全局滚动遥控器'
}

const zhTW: Strings = {
  settingsTitle: '設定',
  tabBehavior: '動作',
  tabStyle: '外觀',
  tabAttach: '吸附視窗',
  triggerMode: '觸發方式',
  dwell: '停留',
  click: '點擊',
  activateMode: '啟用模式',
  single: '單次',
  repeat: '重複',
  dwellTime: '停留時間 (ms)',
  repeatInterval: '重複間隔 (ms)',
  scrollSensitivity: '捲動量 (刻痕)',
  scrollMethod: '捲動方式',
  methodPost: 'Chrome型',
  methodChild: '經典',
  methodInject: '真實滾輪',
  editKeyTime: '解鎖時間 (ms)',
  btnSize: '按鈕大小 (px)',
  btnShape: '按鈕形狀',
  shapeRound: '圓形',
  shapeRounded: '圓角',
  shapeSquare: '方形',
  gaugeStyle: '停留進度樣式',
  gaugeFill: '填滿↑',
  gaugeFillLr: '填滿→',
  gaugeCircular: '環形',
  gaugeExpand: '擴散',
  btnBg: '按鈕背景色',
  gaugeColor: '進度條顏色',
  btnFg: '文字顏色',
  borderColor: '邊框顏色',
  borderWidth: '邊框粗細 (px)',
  opacity: '不透明度',
  language: '語言',
  attachToggle: '吸附到視窗 (跟隨)',
  off: '關',
  on: '開',
  attachAnchor: '吸附位置 (相對目標視窗)',
  filterModeLabel: '視窗過濾方式',
  filterAllow: '允許模式',
  filterBlock: '封鎖模式',
  filterAllowDesc: '僅跟隨勾選的視窗',
  filterBlockDesc: '排除勾選的視窗',
  attachAllow: '允許視窗清單',
  attachAllowHint: '(留空=全部允許)',
  winRefresh: '重新整理清單',
  done: '完成編輯',
  contact: '聯絡',
  maker: '作者',
  licenseNote: 'MIT 授權 — 可自由使用、修改、再散布（保留版權聲明）',
  about: '關於',
  homepage: '首頁',
  email: '電子郵件',
  appDesc: '面向眼動追蹤無障礙的全域捲動遙控器。停留注視按鈕即可捲動前景應用程式。',
  close: '確定',
  winLoading: '載入中…',
  winEmpty: '找不到視窗',
  winNotRunning: '(未執行)',
  winColApp: '應用程式',
  winColTitle: '視窗標題',
  contactSubject: 'GazeScroll 諮詢',
  scrollUp: '捲動↑',
  scrollDown: '捲動↓',
  trayToggle: '顯示 / 隱藏',
  trayQuit: '結束',
  trayTooltip: 'GazeScroll — 全域捲動遙控器'
}

const hi: Strings = {
  settingsTitle: 'सेटिंग्स',
  tabBehavior: 'व्यवहार',
  tabStyle: 'रूप',
  tabAttach: 'विंडो जोड़ें',
  triggerMode: 'ट्रिगर तरीका',
  dwell: 'ठहराव',
  click: 'क्लिक',
  activateMode: 'सक्रियण मोड',
  single: 'एकल',
  repeat: 'दोहराव',
  dwellTime: 'ठहराव समय (ms)',
  repeatInterval: 'दोहराव अंतराल (ms)',
  scrollSensitivity: 'स्क्रॉल मात्रा (नॉच)',
  scrollMethod: 'स्क्रॉल तरीका',
  methodPost: 'Chrome शैली',
  methodChild: 'क्लासिक',
  methodInject: 'असली व्हील',
  editKeyTime: 'अनलॉक समय (ms)',
  btnSize: 'बटन आकार (px)',
  btnShape: 'बटन आकृति',
  shapeRound: 'गोल',
  shapeRounded: 'गोल किनारे',
  shapeSquare: 'चौकोर',
  gaugeStyle: 'ठहराव गेज',
  gaugeFill: 'भराव↑',
  gaugeFillLr: 'भराव→',
  gaugeCircular: 'वृत्ताकार',
  gaugeExpand: 'विस्तार',
  btnBg: 'बटन रंग',
  gaugeColor: 'गेज रंग',
  btnFg: 'टेक्स्ट रंग',
  borderColor: 'बॉर्डर रंग',
  borderWidth: 'बॉर्डर मोटाई (px)',
  opacity: 'अपारदर्शिता',
  language: 'भाषा',
  attachToggle: 'विंडो से जोड़ें (अनुसरण)',
  off: 'बंद',
  on: 'चालू',
  attachAnchor: 'जोड़ने की जगह (लक्ष्य विंडो पर)',
  filterModeLabel: 'विंडो फ़िल्टर',
  filterAllow: 'अनुमति मोड',
  filterBlock: 'ब्लॉक मोड',
  filterAllowDesc: 'केवल चयनित विंडो का अनुसरण',
  filterBlockDesc: 'चयनित को छोड़कर सभी',
  attachAllow: 'अनुमत विंडो सूची',
  attachAllowHint: '(खाली = सभी अनुमत)',
  winRefresh: 'सूची ताज़ा करें',
  done: 'संपादन पूर्ण',
  contact: 'संपर्क',
  maker: 'निर्माता',
  licenseNote: 'MIT लाइसेंस — स्वतंत्र रूप से उपयोग, संशोधन और पुनर्वितरण (कॉपीराइट सूचना बनाए रखें)',
  about: 'जानकारी',
  homepage: 'होमपेज',
  email: 'ईमेल',
  appDesc: 'आई-ट्रैकिंग सुलभता के लिए ग्लोबल स्क्रॉल रिमोट। बटन पर नज़र टिकाने (dwell) पर अग्रभूमि ऐप स्क्रॉल होता है।',
  close: 'ठीक है',
  winLoading: 'लोड हो रहा है…',
  winEmpty: 'कोई विंडो नहीं मिली',
  winNotRunning: '(नहीं चल रही)',
  winColApp: 'ऐप',
  winColTitle: 'विंडो शीर्षक',
  contactSubject: 'GazeScroll पूछताछ',
  scrollUp: 'स्क्रॉल↑',
  scrollDown: 'स्क्रॉल↓',
  trayToggle: 'दिखाएं / छिपाएं',
  trayQuit: 'बाहर निकलें',
  trayTooltip: 'GazeScroll — ग्लोबल स्क्रॉल रिमोट'
}

const es: Strings = {
  settingsTitle: 'Ajustes',
  tabBehavior: 'Comportamiento',
  tabStyle: 'Estilo',
  tabAttach: 'Adjuntar',
  triggerMode: 'Disparo',
  dwell: 'Fijación',
  click: 'Clic',
  activateMode: 'Activación',
  single: 'Único',
  repeat: 'Repetir',
  dwellTime: 'Tiempo de fijación (ms)',
  repeatInterval: 'Intervalo de repetición (ms)',
  scrollSensitivity: 'Cantidad de scroll (muescas)',
  scrollMethod: 'Método de scroll',
  methodPost: 'Chrome',
  methodChild: 'Clásico',
  methodInject: 'Rueda real',
  editKeyTime: 'Tiempo de desbloqueo (ms)',
  btnSize: 'Tamaño de botón (px)',
  btnShape: 'Forma de botón',
  shapeRound: 'Redondo',
  shapeRounded: 'Redondeado',
  shapeSquare: 'Cuadrado',
  gaugeStyle: 'Indicador de fijación',
  gaugeFill: 'Llenar↑',
  gaugeFillLr: 'Llenar→',
  gaugeCircular: 'Anillo',
  gaugeExpand: 'Expandir',
  btnBg: 'Color de botón',
  gaugeColor: 'Color del indicador',
  btnFg: 'Color de texto',
  borderColor: 'Color de borde',
  borderWidth: 'Grosor de borde (px)',
  opacity: 'Opacidad',
  language: 'Idioma',
  attachToggle: 'Adjuntar a ventana (seguir)',
  off: 'Desactivado',
  on: 'Activado',
  attachAnchor: 'Posición (en ventana objetivo)',
  filterModeLabel: 'Filtro de ventanas',
  filterAllow: 'Modo permitir',
  filterBlock: 'Modo bloquear',
  filterAllowDesc: 'Seguir solo las marcadas',
  filterBlockDesc: 'Seguir todas excepto marcadas',
  attachAllow: 'Ventanas permitidas',
  attachAllowHint: '(vacío = todas)',
  winRefresh: 'Actualizar lista',
  done: 'Listo',
  contact: 'Contacto',
  maker: 'Autor',
  licenseNote: 'Licencia MIT — libre uso, modificación y redistribución (conservar el aviso de copyright)',
  about: 'Información',
  homepage: 'Sitio web',
  email: 'Correo',
  appDesc: 'Un control de scroll global para accesibilidad con seguimiento ocular. Fija la mirada (dwell) en un botón y la app en primer plano se desplaza.',
  close: 'Aceptar',
  winLoading: 'Cargando…',
  winEmpty: 'No se encontraron ventanas',
  winNotRunning: '(no en ejecución)',
  winColApp: 'App',
  winColTitle: 'Título de ventana',
  contactSubject: 'Consulta de GazeScroll',
  scrollUp: 'Scroll↑',
  scrollDown: 'Scroll↓',
  trayToggle: 'Mostrar / Ocultar',
  trayQuit: 'Salir',
  trayTooltip: 'GazeScroll — control de scroll global'
}

export const STRINGS: Record<Lang, Strings> = {
  ko,
  en,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  hi,
  es
}

// 로케일 문자열 조회. 알 수 없는 로케일은 한국어로 폴백.
export function t(lang: Lang): Strings {
  return STRINGS[lang] ?? ko
}
