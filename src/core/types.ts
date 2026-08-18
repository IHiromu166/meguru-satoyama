// ---------- 基本 ----------

/** 栄養段階。0 = 分解者(段階外)、1 = 生産者、2〜4 = 消費者 */
export type Trophic = 0 | 1 | 2 | 3 | 4;

export type CardKind =
  | "producer"    // 生産者
  | "consumer"    // 消費者
  | "decomposer"  // 分解者
  | "control"     // 人間の介入(駆除)
  | "invasive";   // 外来種

export type Zone = "deck" | "hand" | "field" | "discard" | "trash";

export type Habitat = "forest" | "grass" | "water";

// ---------- 効果 ----------

export type Effect =
  /** カードを n 枚引く */
  | { t: "draw"; n: number }
  /** エネルギーを n 得る */
  | { t: "energy"; n: number }
  /** 獲得回数を n 増やす */
  | { t: "gain"; n: number }
  /** 捨て札から n 枚を山札の一番上に戻す。kind 指定時はその種別を優先 */
  | { t: "recycle"; n: number; kind?: CardKind }
  /** 指定ゾーンの外来種を n 枚まで廃棄する */
  | { t: "trashInvasive"; n: number; from: Zone[] };

/** 外来種の常在効果。手札にある間だけ働く */
export type Aura =
  /** 生産者のエネルギー産出を n 変化させる(負値) */
  | { t: "producerEnergy"; n: number }
  /** 分解者の効果を無効化する */
  | { t: "blockDecomposer" }
  /** クリーンアップ時、指定段階のカードを1枚捨て札へ送る */
  | { t: "eatConsumer"; trophic: Trophic }
  /** 増殖時に追加で n 枚増える */
  | { t: "extraSpread"; n: number };

// ---------- カード定義 ----------

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  trophic: Trophic;
  /** 供給での獲得コスト。獲得不可(外来種)は null */
  cost: number | null;
  /** 生産者のエネルギー産出。それ以外は未定義 */
  energy?: number;
  /** 捕食成功時、または捕食不要なカードのプレイ時に解決する効果 */
  effects: Effect[];
  /** この在来種が例外的に捕食できる外来種の id */
  eatsInvasive?: string[];
  /** 外来種の常在効果 */
  aura?: Aura[];
  /** 供給 / 外来種の山に積む枚数 */
  supply: number;
  /** UI 表示用の日本語テキスト */
  text: string;
  /** v2 用。v1 では判定に使わない(→ DESIGN.md 第9節) */
  habitat?: Habitat;
}

// ---------- 状態 ----------

export interface CardInstance {
  uid: number;
  defId: string;
}

export type Phase = "main" | "gain" | "invasion" | "cleanup" | "over";

export type Result = "playing" | "collapsed" | "survived";

export interface GameState {
  turn: number;
  phase: Phase;
  result: Result;

  energy: number;
  gainsLeft: number;

  deck: CardInstance[];
  hand: CardInstance[];
  field: CardInstance[];
  discard: CardInstance[];
  trash: CardInstance[];

  supply: Record<string, number>;
  invasivePool: Record<string, number>;
  invasionCounter: number;

  rng: number;
  nextUid: number;

  log: LogEntry[];
}

export interface LogEntry {
  turn: number;
  text: string;
}

export interface ScoreBreakdown {
  diversity: number;
  pyramid: number;
  cycling: number;
  apex: number;
  invasivePenalty: number;
  controlPenalty: number;
  total: number;
}
