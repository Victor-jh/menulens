// i18n strings for v2 Friendly UI.
// The Claude.ai/design prototype was Korean-conversational only ("맘껏 드세요",
// "한 번 물어봐요", "이건 패스"). Our user base is foreigners — Yui (ja) and
// Aisha (en/halal) personas in the proposal §1.2. So we translate that voice
// into 5 languages while preserving the friendliness.
//
// Style guide:
// - Lower-case, conversational. Same length as Korean original where possible.
// - No corporate "Please" / "Sorry" boilerplate.
// - Romanization stays as English ASCII (Pretendard handles ko, system fonts handle rest).

import type { UserProfile } from "../../types";

type Lang = UserProfile["language"];

interface FriendlyStrings {
  // Top-of-results greeting
  greetingPrefix: string;          // "Hi there, " / "안녕하세요, "
  greetingSuffix: string;          // ! (some scripts use no punctuation)
  // Counter line: "{n} of {total} are {ok}"
  counterTemplate: (n: number, total: number) => string; // returns full sentence
  // Pill tabs
  tabAll: string;
  tabGreen: string;
  tabYellow: string;
  tabRed: string;
  // Card status badges
  signalGreen: string;       // "맘껏 드세요" / "Eat freely"
  signalYellow: string;      // "한 번 물어봐요" / "Ask first"
  signalRed: string;         // "이건 패스" / "Skip this"
  // Card body messages
  msgFreeSide: string;
  msgRedWithTriggers: (triggers: string[]) => string;
  msgRedNoTriggers: string;
  msgYellowWithTrigger: (trigger: string) => string;
  msgYellowPriceOnly: (pct: number) => string;
  msgGreen: string;
  // Footer buttons
  btnAnotherPhoto: string;
  btnPickForMe: string;
  // Empty state
  emptyTitle: string;
  emptySubtitle: string;
  emptyAction: string;
  // ShowStaff full-screen
  showStaffTitle: string;            // "Show this to staff"
  showStaffOrderingFor: string;      // "Ordering for"
  showStaffPlay: string;             // "▶ Play Korean audio"
  showStaffBack: string;
  // Capture stages
  stageAim: string;
  stageScanning: string;
  stageParsing: string;
}

const KO: FriendlyStrings = {
  greetingPrefix: "",
  greetingSuffix: "님, 안녕하세요!",
  counterTemplate: (n, total) =>
    `메뉴 ${total}개 중에서 ${n}개는 바로 드실 수 있어요`,
  tabAll: "전체",
  tabGreen: "맘껏",
  tabYellow: "물어봐요",
  tabRed: "패스",
  signalGreen: "맘껏 드세요",
  signalYellow: "한 번 물어봐요",
  signalRed: "이건 패스",
  msgFreeSide: "무료 반찬이에요. 주문 안 해도 나와요!",
  msgRedWithTriggers: (t) => `${t.join(", ")} 들어 있어요`,
  msgRedNoTriggers: "드시기 어려운 메뉴예요",
  msgYellowWithTrigger: (t) =>
    `${t} 들어있을 수 있어요. 직원분께 한 번 여쭤보세요`,
  msgYellowPriceOnly: (pct) => `평소보다 ${pct}% 비싸요`,
  msgGreen: "편하게 드셔도 돼요",
  btnAnotherPhoto: "한 장 더",
  btnPickForMe: "골라줄게요",
  emptyTitle: "해당하는 메뉴가 없어요",
  emptySubtitle: "다른 필터를 눌러볼까요?",
  emptyAction: "전체 보기",
  showStaffTitle: "이 폰을 직원분께 보여주세요",
  showStaffOrderingFor: "주문",
  showStaffPlay: "▶ 한국어로 듣기",
  showStaffBack: "뒤로",
  stageAim: "메뉴판을 사각형 안에 맞춰주세요",
  stageScanning: "글자 읽는 중…",
  stageParsing: "재료 확인 중…",
};

const EN: FriendlyStrings = {
  greetingPrefix: "Hi ",
  greetingSuffix: "!",
  counterTemplate: (n, total) =>
    `${n} of ${total} dishes are safe for you to order`,
  tabAll: "All",
  tabGreen: "Safe",
  tabYellow: "Ask",
  tabRed: "Skip",
  signalGreen: "Eat freely",
  signalYellow: "Ask first",
  signalRed: "Skip this",
  msgFreeSide: "Free side dish — comes without ordering!",
  msgRedWithTriggers: (t) => `Contains ${t.join(", ")}`,
  msgRedNoTriggers: "Not safe for your profile",
  msgYellowWithTrigger: (t) => `May contain ${t}. Ask the staff to confirm.`,
  msgYellowPriceOnly: (pct) => `Costs ${pct}% more than typical`,
  msgGreen: "All clear for you",
  btnAnotherPhoto: "📷 Another",
  btnPickForMe: "🎲 Pick for me",
  emptyTitle: "No matches in this filter",
  emptySubtitle: "Try a different category",
  emptyAction: "Show all",
  showStaffTitle: "Show this to the staff",
  showStaffOrderingFor: "Ordering",
  showStaffPlay: "▶ Play Korean audio",
  showStaffBack: "Back",
  stageAim: "Frame the menu inside the box",
  stageScanning: "Reading text…",
  stageParsing: "Checking ingredients…",
};

const JA: FriendlyStrings = {
  greetingPrefix: "",
  greetingSuffix: "さん、こんにちは!",
  counterTemplate: (n, total) =>
    `${total}品中、${n}品はすぐに注文できます`,
  tabAll: "全部",
  tabGreen: "OK",
  tabYellow: "確認",
  tabRed: "パス",
  signalGreen: "そのままどうぞ",
  signalYellow: "一度聞いてみて",
  signalRed: "これはパス",
  msgFreeSide: "無料のおかずです。注文不要で出てきます",
  msgRedWithTriggers: (t) => `${t.join("・")}が入っています`,
  msgRedNoTriggers: "あなたには合いません",
  msgYellowWithTrigger: (t) => `${t}が入っているかも。店員さんに確認してください`,
  msgYellowPriceOnly: (pct) => `通常より ${pct}% 高いです`,
  msgGreen: "安心して注文できます",
  btnAnotherPhoto: "📷 もう1枚",
  btnPickForMe: "🎲 おまかせ",
  emptyTitle: "該当するメニューがありません",
  emptySubtitle: "他のフィルターを試してみては?",
  emptyAction: "全部見る",
  showStaffTitle: "このまま店員さんに見せてください",
  showStaffOrderingFor: "注文",
  showStaffPlay: "▶ 韓国語で再生",
  showStaffBack: "戻る",
  stageAim: "メニューを枠に合わせてください",
  stageScanning: "文字を読んでいます…",
  stageParsing: "食材を確認中…",
};

const ZH_HANS: FriendlyStrings = {
  greetingPrefix: "",
  greetingSuffix: ",您好!",
  counterTemplate: (n, total) =>
    `${total} 道菜中,${n} 道可以放心点`,
  tabAll: "全部",
  tabGreen: "可点",
  tabYellow: "询问",
  tabRed: "避开",
  signalGreen: "尽情享用",
  signalYellow: "先问一下",
  signalRed: "跳过",
  msgFreeSide: "免费小菜,无需点单就会上",
  msgRedWithTriggers: (t) => `含有 ${t.join("、")}`,
  msgRedNoTriggers: "不适合您",
  msgYellowWithTrigger: (t) => `可能含有 ${t},请向服务员确认`,
  msgYellowPriceOnly: (pct) => `比平常贵 ${pct}%`,
  msgGreen: "可以放心点",
  btnAnotherPhoto: "📷 再拍一张",
  btnPickForMe: "🎲 帮我选",
  emptyTitle: "没有符合的菜",
  emptySubtitle: "试试其他分类?",
  emptyAction: "查看全部",
  showStaffTitle: "请把手机给店员看",
  showStaffOrderingFor: "点单",
  showStaffPlay: "▶ 韩语朗读",
  showStaffBack: "返回",
  stageAim: "请把菜单对准框内",
  stageScanning: "正在识别文字…",
  stageParsing: "正在确认食材…",
};

const ZH_HANT: FriendlyStrings = {
  ...ZH_HANS,
  greetingSuffix: ",您好!",
  signalGreen: "盡情享用",
  signalYellow: "先問一下",
  signalRed: "跳過",
  tabGreen: "可點",
  msgFreeSide: "免費小菜,無需點單就會上",
  msgRedWithTriggers: (t) => `含有 ${t.join("、")}`,
  msgRedNoTriggers: "不適合您",
  msgYellowWithTrigger: (t) => `可能含有 ${t},請向服務員確認`,
  msgYellowPriceOnly: (pct) => `比平常貴 ${pct}%`,
  msgGreen: "可以放心點",
  btnAnotherPhoto: "📷 再拍一張",
  btnPickForMe: "🎲 幫我選",
  emptyTitle: "沒有符合的菜",
  emptySubtitle: "試試其他分類?",
  emptyAction: "查看全部",
  showStaffTitle: "請把手機給店員看",
  showStaffPlay: "▶ 韓語朗讀",
  showStaffBack: "返回",
  stageAim: "請把菜單對準框內",
  stageScanning: "正在辨識文字…",
  stageParsing: "正在確認食材…",
};

const TABLE: Record<Lang, FriendlyStrings> = {
  ko: KO,
  en: EN,
  ja: JA,
  "zh-Hans": ZH_HANS,
  "zh-Hant": ZH_HANT,
};

export function strings(lang: Lang): FriendlyStrings {
  return TABLE[lang] ?? EN;
}

export type { FriendlyStrings, Lang };
