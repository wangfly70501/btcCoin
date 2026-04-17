export interface Kline {
  open: number
  high: number
  low: number
  close: number
  volume: number
  openTime: number
  closeTime: number
}

export interface Indicator {
  name: string
  value: string
  color: string
  signal: 'long' | 'short' | 'neutral'
}

export interface Signal {
  cls: 'long' | 'short' | 'wait'
  arrow: string
  label: string
  conf: number
  strength: string
  reasons: { text: string; color: string }[]
  entry: number
  tp: number
  sl: number
}

export interface Position {
  active: boolean
  dir?: 'long' | 'short'
  ep?: number
  tp?: number
  sl?: number
  margin?: number
  leverage?: number
  pnl?: number
  pusd?: number
  status?: 'tp' | 'sl' | null
  msg?: string
}

export interface LogEntry {
  id: number
  type: 'l' | 's' | 't' | 'sl'
  icon: string
  msg: string
  px: number
  time: string
}

export interface TradePlan {
  direction: 'long' | 'short' | 'wait'
  trend: string
  entryZone: { low: number; high: number }
  sl: number
  tp1: number
  tp2: number
  risk: number
  reward1: number
  reward2: number
  rr1: string
  rr2: string
  atr: number
  waitReason: string
  entryReason: string
}

export interface MTFSignal {
  timeframe: string
  label: string
  cls: 'long' | 'short' | 'wait'
  conf: number
}
export interface SymbolInfo {
  symbol: string
  baseAsset: string
  quoteAsset: string
}

export interface OrderbookRow {
  ask: number
  aq: string
  bid: number
  bq: string
}

export type Timeframe = '15m' | '1h' | '4h' | '8h' | '12h' | '1d'

export const TIMEFRAMES: { label: string; value: Timeframe; seconds: number }[] = [
  { label: '15分', value: '15m', seconds: 900 },
  { label: '1小時', value: '1h', seconds: 3600 },
  { label: '4小時', value: '4h', seconds: 14400 },
  { label: '8小時', value: '8h', seconds: 28800 },
  { label: '12小時', value: '12h', seconds: 43200 },
  { label: '日線', value: '1d', seconds: 86400 },
]

export const HOT_SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','AVAXUSDT','ADAUSDT','LINKUSDT','DOTUSDT',
  'MATICUSDT','LTCUSDT','UNIUSDT','ATOMUSDT','NEARUSDT',
]
