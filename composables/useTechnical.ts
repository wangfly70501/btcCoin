import type { Kline, Indicator, Signal, TradePlan } from '~/types'

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

  function calcATR(klines: Kline[], period = 14): number {
    if (klines.length < period + 1) return 0
    const trs: number[] = []
    for (let i = 1; i < klines.length; i++) {
      const k = klines[i], prev = klines[i - 1]
      const tr = Math.max(
        k.high - k.low,
        Math.abs(k.high - prev.close),
        Math.abs(k.low - prev.close)
      )
      trs.push(tr)
    }
    const recent = trs.slice(-period)
    return recent.reduce((a, b) => a + b, 0) / period
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
    tradePlan: TradePlan
  } {
    const closes = klines.map(k => k.close)
    const p = price || closes[closes.length - 1]

    const rsiV = calcRSI(closes, 14)
    const { hist: macdHist, macd: macdV } = calcMACD(closes)
    const { pos: bbPos, upper: bbUpper, lower: bbLower } = calcBB(closes, 20)
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
    if (score >= 3) {
      signal = {
        cls: 'long',
        arrow: '▲',
        label: score >= 5 ? '強力做多' : '建議做多',
        conf,
        strength: score >= 5 ? '高信心 — 多頭趨勢明確' : '中等信心 — 偏多格局',
        reasons,
        entry: p,
        tp: p * 1.02,
        sl: p * 0.992,
      }
    } else if (score <= -3) {
      signal = {
        cls: 'short',
        arrow: '▼',
        label: score <= -5 ? '強力做空' : '建議做空',
        conf,
        strength: score <= -5 ? '高信心 — 空頭趨勢明確' : '中等信心 — 偏空格局',
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

    // ── Trade Plan ────────────────────────────────────────
    const atr = calcATR(klines, 14)
    const atrMult = 1.5

    // Entry zone: wait for pullback to EMA50 area
    const entryLow = Math.min(ema50, ema20) * 0.999
    const entryHigh = Math.max(ema50, ema20) * 1.001

    // ATR-based SL/TP
    let slPrice: number, tp1Price: number, tp2Price: number
    let direction: 'long' | 'short' | 'wait' = signal.cls

    if (direction === 'long') {
      slPrice = ema200 - atr * 0.5  // below EMA200
      tp1Price = p + atr * 2        // 2x ATR
      tp2Price = bbUpper            // BB upper band
    } else if (direction === 'short') {
      slPrice = ema200 + atr * 0.5
      tp1Price = p - atr * 2
      tp2Price = bbLower
    } else {
      slPrice = p - atr * atrMult
      tp1Price = p + atr * 2
      tp2Price = p + atr * 4
    }

    const risk = Math.abs(p - slPrice)
    const reward1 = Math.abs(tp1Price - p)
    const reward2 = Math.abs(tp2Price - p)
    const rr1 = (reward1 / risk).toFixed(1)
    const rr2 = (reward2 / risk).toFixed(1)

    // Entry reason
    let entryReason = ''
    let waitReason = ''
    if (direction === 'long') {
      if (p > entryHigh * 1.005) {
        waitReason = `等回測 EMA 支撐區 $${Math.round(entryLow).toLocaleString()} - $${Math.round(entryHigh).toLocaleString()} 再進場，勿追高`
      } else {
        entryReason = `現價接近 EMA 支撐區，可考慮進場`
      }
    } else if (direction === 'short') {
      if (p < entryLow * 0.995) {
        waitReason = `等反彈至 EMA 壓力區 $${Math.round(entryLow).toLocaleString()} - $${Math.round(entryHigh).toLocaleString()} 再做空，勿追空`
      } else {
        entryReason = `現價接近 EMA 壓力區，可考慮做空`
      }
    } else {
      waitReason = '多空訊號混雜，等待明確方向再進場'
    }

    const tradePlan: TradePlan = {
      direction,
      trend: p > ema200 ? '主趨勢多頭' : '主趨勢空頭',
      entryZone: { low: entryLow, high: entryHigh },
      sl: slPrice,
      tp1: tp1Price,
      tp2: tp2Price,
      risk,
      reward1,
      reward2,
      rr1,
      rr2,
      atr,
      waitReason,
      entryReason,
    }

    return { indicators, signal, bulls, bears, tradePlan }
  }

  return { calcRSI, calcEMA, calcMACD, calcBB, calcATR, analyse }
}
