import type { Kline, Indicator, Signal } from '~/types'

export function useTechnical() {
  function calcRSI(closes: number[], period = 14): number {
    if (closes.length < period + 1) return 50
    let gains = 0, losses = 0
    for (let i = closes.length - period; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1]
      if (d > 0) gains += d; else losses -= d
    }
    const avgG = gains / period
    const avgL = losses / period || 0.0001
    const rs = avgG / avgL
    return Math.round(100 - (100 / (1 + rs)))
  }

  function calcEMA(closes: number[], period: number): number {
    if (closes.length < period) return closes[closes.length - 1] || 0
    const k = 2 / (period + 1)
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k)
    return ema
  }

  function calcMACD(closes: number[]): { macd: number; signal: number; hist: number } {
    if (closes.length < 26) return { macd: 0, signal: 0, hist: 0 }
    const ema12 = calcEMA(closes, 12)
    const ema26 = calcEMA(closes, 26)
    const macd = ema12 - ema26
    // simplified 9-period signal
    const macdSeries: number[] = []
    for (let i = 26; i <= closes.length; i++) {
      const e12 = calcEMA(closes.slice(0, i), 12)
      const e26 = calcEMA(closes.slice(0, i), 26)
      macdSeries.push(e12 - e26)
    }
    const sig = calcEMA(macdSeries, 9)
    return { macd, signal: sig, hist: macd - sig }
  }

  function calcBB(closes: number[], period = 20): { pos: number; upper: number; lower: number; mid: number } {
    if (closes.length < period) return { pos: 50, upper: 0, lower: 0, mid: 0 }
    const slice = closes.slice(-period)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
    const upper = mean + 2 * std
    const lower = mean - 2 * std
    const last = closes[closes.length - 1]
    const pos = Math.round(((last - lower) / ((upper - lower) || 1)) * 100)
    return { pos: Math.max(0, Math.min(100, pos)), upper, lower, mid: mean }
  }

  function calcVolumeTrend(klines: Kline[]): number {
    if (klines.length < 20) return 50
    const recent = klines.slice(-5).reduce((a, k) => a + k.volume, 0) / 5
    const prev = klines.slice(-20, -5).reduce((a, k) => a + k.volume, 0) / 15
    const ratio = recent / (prev || 1)
    return Math.min(100, Math.round(ratio * 50))
  }

  function analyse(klines: Kline[], price: number, lsRatio: number, fundingRate: number, fgIndex: number): {
    indicators: Indicator[]
    signal: Signal
    bulls: number
    bears: number
  } {
    const closes = klines.map(k => k.close)
    const p = price || closes[closes.length - 1]

    const rsiV = calcRSI(closes, 14)
    const { hist: macdHist, macd: macdV } = calcMACD(closes)
    const { pos: bbPos } = calcBB(closes, 20)
    const ema20 = calcEMA(closes, 20)
    const ema50 = calcEMA(closes, Math.min(50, closes.length))
    const ema200 = calcEMA(closes, Math.min(200, closes.length))
    const volScore = calcVolumeTrend(klines)

    const indicators: Indicator[] = [
      {
        name: 'RSI (14)',
        value: String(rsiV),
        color: rsiV > 70 ? 'var(--red)' : rsiV < 30 ? 'var(--green)' : 'var(--yellow)',
        signal: rsiV > 70 ? 'short' : rsiV < 30 ? 'long' : 'neutral'
      },
      {
        name: 'MACD',
        value: macdV.toFixed(2),
        color: macdHist > 0 ? 'var(--green)' : 'var(--red)',
        signal: macdHist > 0 ? 'long' : 'short'
      },
      {
        name: 'BB 位置',
        value: bbPos + '%',
        color: bbPos > 80 ? 'var(--red)' : bbPos < 20 ? 'var(--green)' : 'var(--text)',
        signal: bbPos > 80 ? 'short' : bbPos < 20 ? 'long' : 'neutral'
      },
      {
        name: 'EMA 20',
        value: '$' + Math.round(ema20).toLocaleString(),
        color: p > ema20 ? 'var(--green)' : 'var(--red)',
        signal: p > ema20 ? 'long' : 'short'
      },
      {
        name: 'EMA 50',
        value: '$' + Math.round(ema50).toLocaleString(),
        color: p > ema50 ? 'var(--green)' : 'var(--red)',
        signal: p > ema50 ? 'long' : 'short'
      },
      {
        name: 'EMA 200',
        value: '$' + Math.round(ema200).toLocaleString(),
        color: p > ema200 ? 'var(--green)' : 'var(--red)',
        signal: p > ema200 ? 'long' : 'short'
      },
      {
        name: '成交量動能',
        value: volScore + '%',
        color: volScore > 60 ? 'var(--green)' : volScore > 40 ? 'var(--dim)' : 'var(--red)',
        signal: volScore > 60 ? 'long' : volScore < 35 ? 'short' : 'neutral'
      },
    ]

    const longCount = indicators.filter(i => i.signal === 'long').length
    const shortCount = indicators.filter(i => i.signal === 'short').length
    const score = longCount - shortCount
    const totalInds = indicators.length
    const bulls = Math.round((longCount / totalInds) * 10)
    const bears = Math.round((shortCount / totalInds) * 10)

    const conf = Math.min(Math.round(Math.abs(score) / totalInds * 100) + 15, 95)

    const reasons = [
      {
        text: `RSI ${rsiV} — ${rsiV > 70 ? '超買過熱' : rsiV < 30 ? '超賣反彈' : '中性區間'}`,
        color: indicators[0].color
      },
      {
        text: `MACD ${macdHist > 0 ? '多頭動能↑' : '空頭動能↓'} (${macdV.toFixed(1)})`,
        color: indicators[1].color
      },
      {
        text: `BB ${bbPos}% — ${bbPos > 80 ? '上軌壓力' : bbPos < 20 ? '下軌支撐' : '帶中運行'}`,
        color: indicators[2].color
      },
      {
        text: `EMA 趨勢：20${p > ema20 ? '↑' : '↓'} / 50${p > ema50 ? '↑' : '↓'} / 200${p > ema200 ? '↑' : '↓'}`,
        color: p > ema20 && p > ema50 ? 'var(--green)' : p < ema20 && p < ema50 ? 'var(--red)' : 'var(--yellow)'
      },
      {
        text: `多空比 ${lsRatio.toFixed(3)} — ${lsRatio > 1.1 ? '多頭佔優' : lsRatio < 0.9 ? '空頭佔優' : '均勢'}`,
        color: lsRatio > 1.05 ? 'var(--green)' : lsRatio < 0.95 ? 'var(--red)' : 'var(--yellow)'
      },
      {
        text: `資金費率 ${fundingRate >= 0 ? '+' : ''}${fundingRate.toFixed(4)}% — ${fundingRate > 0.01 ? '多付空偏空' : fundingRate < -0.01 ? '空付多偏多' : '費率中性'}`,
        color: fundingRate > 0.01 ? 'var(--red)' : fundingRate < -0.01 ? 'var(--green)' : 'var(--yellow)'
      },
    ]

    let signal: Signal
    if (score >= 4) {
      signal = {
        cls: 'long',
        arrow: '▲',
        label: score >= 6 ? '強力做多' : '建議做多',
        conf,
        strength: score >= 6 ? '高信心 — 多頭趨勢明確' : '中等信心 — 偏多格局',
        reasons,
        entry: p,
        tp: p * 1.02,
        sl: p * 0.992,
      }
    } else if (score <= -4) {
      signal = {
        cls: 'short',
        arrow: '▼',
        label: score <= -6 ? '強力做空' : '建議做空',
        conf,
        strength: score <= -6 ? '高信心 — 空頭趨勢明確' : '中等信心 — 偏空格局',
        reasons,
        entry: p,
        tp: p * 0.98,
        sl: p * 1.008,
      }
    } else {
      signal = {
        cls: 'wait',
        arrow: '◈',
        label: '觀望等待',
        conf: 0,
        strength: '多空訊號混雜，建議不強行進場',
        reasons,
        entry: p,
        tp: p * 1.015,
        sl: p * 0.985,
      }
    }

    return { indicators, signal, bulls, bears }
  }

  return { calcRSI, calcEMA, calcMACD, calcBB, analyse }
}
