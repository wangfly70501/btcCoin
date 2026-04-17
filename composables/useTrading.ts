import type { Kline, Signal, Indicator, Position, LogEntry, Timeframe, TradePlan, MTFSignal } from '~/types'
import { TIMEFRAMES } from '~/types'

let logId = 0

export function useTrading() {
  const { fetchPrice, fetchKlines, fetchFundingRate, fetchOpenInterest, fetchLSRatio, createPriceWS } = useBinance()
  const { analyse } = useTechnical()

  // ── State ──────────────────────────────────────────────
  const symbol = ref('BTCUSDT')
  const timeframe = ref<Timeframe>('1h')
  const price = ref(0)
  const priceDir = ref<'up' | 'down'>('up')
  const prevPrice = ref(0)
  const change24h = ref(0)
  const volume24h = ref(0)
  const fundingRate = ref(0)
  const openInterest = ref(0)
  const lsRatio = ref(1)
  const indexPrice = ref(0)
  const fearGreed = ref(50)
  const isLive = ref(false)
  const loading = ref(true)

  // Klines
  const klines = ref<Kline[]>([])

  // Analysis
  const indicators = ref<Indicator[]>([])
  const signal = ref<Signal>({ cls: 'wait', arrow: '◈', label: '載入中', conf: 0, strength: '', reasons: [], entry: 0, tp: 0, sl: 0 })
  const bulls = ref(5)
  const bears = ref(0)
  const lastSigCls = ref('')
  const tradePlan = ref<TradePlan | null>(null)
  const mtfSignals = ref<MTFSignal[]>([])

  // Log / Toast
  const signalLog = ref<LogEntry[]>([])
  const toast = ref({ show: false, type: '', msg: '' })
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  // Position
  const position = ref<Position>({ active: false })

  // Countdown
  const nextUpdate = ref('--:--')
  let nextCandleTs = 0

  // Intervals / WS
  let priceWS: WebSocket | null = null
  let timers: ReturnType<typeof setInterval>[] = []
  let simMode = false

  // ── Computed ───────────────────────────────────────────
  const closes = computed(() => klines.value.map(k => k.close))

  // ── Helpers ────────────────────────────────────────────
  function fp(v: number) {
    if (!v) return '0.00'
    // Dynamic decimals based on price
    const decimals = v >= 1000 ? 2 : v >= 1 ? 4 : 6
    return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  function fb(v: number) {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
    if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K'
    return v.toLocaleString()
  }

  function nowStr() {
    return new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function showToast(type: string, msg: string, dur = 5000) {
    if (toastTimer) clearTimeout(toastTimer)
    toast.value = { show: true, type, msg }
    toastTimer = setTimeout(() => toast.value = { show: false, type: '', msg: '' }, dur)
  }

  function addLog(type: LogEntry['type'], icon: string, msg: string, px: number) {
    signalLog.value.unshift({ id: logId++, type, icon, msg, px, time: nowStr() })
    if (signalLog.value.length > 50) signalLog.value.pop()
  }

  // ── Analysis ───────────────────────────────────────────
  function runAnalysis() {
    if (klines.value.length < 20) return
    const result = analyse(klines.value, price.value, lsRatio.value, fundingRate.value, fearGreed.value)
    indicators.value = result.indicators
    bulls.value = result.bulls
    bears.value = result.bears
    tradePlan.value = result.tradePlan

    const ns = result.signal
    signal.value = ns

    if (ns.cls !== lastSigCls.value) {
      const prev = lastSigCls.value
      lastSigCls.value = ns.cls
      if (ns.cls === 'long') {
        addLog('l', '▲', `做多訊號 — ${ns.label} 信心${ns.conf}%`, price.value)
        if (ns.conf >= 60) showToast('tp', `▲ 做多訊號！${ns.label}  信心 ${ns.conf}%`)
      } else if (ns.cls === 'short') {
        addLog('s', '▼', `做空訊號 — ${ns.label} 信心${ns.conf}%`, price.value)
        if (ns.conf >= 60) showToast('sl', `▼ 做空訊號！${ns.label}  信心 ${ns.conf}%`)
      } else if (prev !== '') {
        addLog('t', '🔔', `訊號反轉 → 觀望，考慮止盈`, price.value)
        showToast('warn', `🔔 訊號反轉！考慮止盈或平倉`)
      }
    }
  }

  // ── MTF Analysis ───────────────────────────────────────
  async function loadMTF() {
    const tfList: Timeframe[] = ['15m', '1h', '4h']
    const results: MTFSignal[] = []
    for (const tf of tfList) {
      if (tf === timeframe.value) {
        // 用當前已有資料
        const s = signal.value
        results.push({
          timeframe: tf,
          label: s.label,
          cls: s.cls,
          conf: s.conf,
        })
        continue
      }
      try {
        const data = await fetchKlines(symbol.value, tf, 60)
        if (data.length < 20) continue
        const r = analyse(data, price.value, lsRatio.value, fundingRate.value, fearGreed.value)
        results.push({
          timeframe: tf,
          label: r.signal.label,
          cls: r.signal.cls,
          conf: r.signal.conf,
        })
      } catch { /* skip */ }
    }
    mtfSignals.value = results
  }

  // ── Position ───────────────────────────────────────────
  function openPosition(dir: 'long' | 'short', ep: number, mg: number, lev: number) {
    position.value = {
      active: true, dir, ep,
      tp: dir === 'long' ? ep * 1.02 : ep * 0.98,
      sl: dir === 'long' ? ep * 0.992 : ep * 1.008,
      margin: mg, leverage: lev,
      pnl: 0, pusd: 0, status: null, msg: ''
    }
    addLog('l', dir === 'long' ? '▲' : '▼', `模擬${dir === 'long' ? '做多' : '做空'}開倉 ${lev}x`, ep)
  }

  function closePosition() {
    if (!position.value.active) return
    addLog('t', '◼', `平倉 PnL: ${(position.value.pnl || 0).toFixed(2)}%`, price.value)
    position.value = { active: false }
  }

  function updatePosition() {
    const pos = position.value
    if (!pos.active || !pos.ep || !price.value) return
    const p = price.value
    const raw = ((p - pos.ep) / pos.ep) * 100 * (pos.leverage || 1)
    pos.pnl = pos.dir === 'long' ? raw : -raw
    pos.pusd = (pos.margin || 0) * (pos.pnl || 0) / 100

    if (!pos.status) {
      const tpHit = pos.dir === 'long' ? p >= pos.tp! : p <= pos.tp!
      const slHit = pos.dir === 'long' ? p <= pos.sl! : p >= pos.sl!
      if (tpHit) {
        pos.status = 'tp'
        pos.msg = `🎯 已達止盈 $${fp(pos.tp!)}，建議獲利了結！`
        showToast('tp', `✅ 止盈觸發！+${pos.pnl.toFixed(2)}%  建議平倉`)
        addLog('t', '🎯', `止盈 +${pos.pnl.toFixed(2)}%`, p)
      } else if (slHit) {
        pos.status = 'sl'
        pos.msg = `⛔ 觸及止損 $${fp(pos.sl!)}，建議立即止損！`
        showToast('sl', `🚨 止損觸發！${pos.pnl.toFixed(2)}%`)
        addLog('sl', '⛔', `止損 ${pos.pnl.toFixed(2)}%`, p)
      } else {
        const dist = Math.abs(p - pos.sl!) / pos.ep * 100
        if (dist < 0.3) showToast('warn', `⚠ 接近止損！距離 ${dist.toFixed(3)}%`)
      }
    }
  }

  // ── Countdown ──────────────────────────────────────────
  function updateCountdown() {
    const diff = Math.max(0, nextCandleTs - Date.now())
    const m = Math.floor(diff / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    nextUpdate.value = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

    // 新K線收盤 → 拉新資料 → 重算訊號
    if (diff <= 1000 && nextCandleTs > 0) {
      const tf = TIMEFRAMES.find(t => t.value === timeframe.value)
      nextCandleTs += (tf?.seconds || 3600) * 1000
      // 先抓最新市場數據，再拉K線，最後重算
      loadMarketData().then(() => {
        loadKlines().then(() => runAnalysis())
      })
    }
  }

  // ── Data Fetching ──────────────────────────────────────
  async function loadKlines() {
    const data = await fetchKlines(symbol.value, timeframe.value, 100)
    if (data.length > 0) {
      klines.value = data
      // Set next candle time
      const tf = TIMEFRAMES.find(t => t.value === timeframe.value)
      const lastClose = data[data.length - 1].closeTime
      nextCandleTs = lastClose + 1
    }
    return data.length > 0
  }

  async function loadMarketData() {
    const [fr, ls] = await Promise.all([
      fetchFundingRate(symbol.value),
      fetchLSRatio(symbol.value),
    ])
    fundingRate.value = fr
    lsRatio.value = ls

    const oi = await fetchOpenInterest(symbol.value)
    openInterest.value = oi * price.value
  }

  function connectPriceWS() {
    if (priceWS) { priceWS.close(); priceWS = null }
    const targetSymbol = symbol.value // 記住當前 symbol，避免非同步切換問題
    priceWS = createPriceWS(targetSymbol, (p) => {
      // 確保收到的是當前 symbol 的價格，不是舊幣種的
      if (symbol.value !== targetSymbol) return
      priceDir.value = p >= price.value ? 'up' : 'down'
      prevPrice.value = price.value
      price.value = p
      indexPrice.value = p
      isLive.value = true
      updatePosition()
    })
    priceWS.onerror = () => {
      isLive.value = false
      // WS 失敗時改用 REST 輪詢
      const pollTimer = setInterval(async () => {
        if (symbol.value !== targetSymbol) { clearInterval(pollTimer); return }
        const data = await fetchPrice(targetSymbol)
        if (data) {
          priceDir.value = data.price >= price.value ? 'up' : 'down'
          price.value = data.price
          indexPrice.value = data.price
          change24h.value = data.change24h
        }
      }, 5000)
      timers.push(pollTimer)
    }
  }

  // ── Simulation Fallback ────────────────────────────────
  let simTimer: ReturnType<typeof setInterval> | null = null

  function stopSimulation() {
    if (simTimer) { clearInterval(simTimer); simTimer = null }
    simMode = false
  }

  function startSimulation(basePrice: number) {
    stopSimulation()
    simMode = true
    let p = basePrice || 95000 + Math.random() * 3000
    price.value = p
    indexPrice.value = p
    change24h.value = (Math.random() - 0.5) * 6
    fundingRate.value = (Math.random() - 0.48) * 0.05
    lsRatio.value = 0.85 + Math.random() * 0.4
    openInterest.value = 8e9 + Math.random() * 2e9
    volume24h.value = 25e9 + Math.random() * 10e9

    // Simulate klines
    const simKlines: Kline[] = []
    let sp = p * (0.92 + Math.random() * 0.04)
    const now = Date.now()
    const tf = TIMEFRAMES.find(t => t.value === timeframe.value)
    const interval = (tf?.seconds || 3600) * 1000
    for (let i = 99; i >= 0; i--) {
      const o = sp
      sp *= 1 + (Math.random() - 0.49) * 0.015
      const h = Math.max(o, sp) * (1 + Math.random() * 0.005)
      const l = Math.min(o, sp) * (1 - Math.random() * 0.005)
      simKlines.push({ openTime: now - i * interval, open: o, high: h, low: l, close: sp, volume: Math.random() * 1000 + 100, closeTime: now - i * interval + interval - 1 })
    }
    simKlines[simKlines.length - 1].close = p
    klines.value = simKlines
    nextCandleTs = now + interval

    // 模擬價格更新：5秒一次就夠，不需要 1.5 秒（避免頻繁 re-render）
    simTimer = setInterval(() => {
      const d = (Math.random() - 0.495) * p * 0.0008
      p = Math.max(p + d, 1)
      priceDir.value = d >= 0 ? 'up' : 'down'
      prevPrice.value = price.value
      price.value = p
      indexPrice.value = p
      change24h.value += (Math.random() - 0.5) * 0.02
      // 只更新最後一根K線收盤價，不觸發訊號重算
      if (klines.value.length > 0) {
        klines.value[klines.value.length - 1] = {
          ...klines.value[klines.value.length - 1],
          close: p
        }
      }
      updatePosition()
    }, 5000)
  }

  // ── Init / Symbol Change ───────────────────────────────
  async function init() {
    loading.value = true
    lastSigCls.value = ''
    signalLog.value = []
    klines.value = []
    price.value = 0

    // 停掉舊的模擬 timer 和 WebSocket
    stopSimulation()
    if (priceWS) { priceWS.close(); priceWS = null }

    // Try live data
    const priceData = await fetchPrice(symbol.value)
    if (priceData) {
      price.value = priceData.price
      change24h.value = priceData.change24h
      volume24h.value = priceData.volume
      indexPrice.value = priceData.price
      isLive.value = true
    }

    const klinesOk = await loadKlines()

    if (!priceData || !klinesOk) {
      // 模擬模式：用抓到的價格，沒抓到才用預設值，絕不重設 symbol
      startSimulation(priceData?.price || 95000)
      isLive.value = false
      loading.value = false
      runAnalysis()
      return
    }

    await loadMarketData()
    connectPriceWS()
    loading.value = false
    runAnalysis()
    loadMTF()
  }

  async function changeSymbol(newSymbol: string) {
    if (newSymbol === symbol.value) return // 同幣種不重載
    symbol.value = newSymbol
    position.value = { active: false }
    lastSigCls.value = '' // 清空訊號狀態，避免舊訊號殘留
    await init()
  }

  async function changeTimeframe(tf: Timeframe) {
    if (tf === timeframe.value) return
    timeframe.value = tf
    loading.value = true
    const ok = await loadKlines()
    if (ok) { runAnalysis(); loadMTF() }
    loading.value = false
  }

  // ── Lifecycle ──────────────────────────────────────────
  onMounted(async () => {
    await init()

    // Countdown tick — 只有這個每秒跑，並在新K線收盤時觸發 loadKlines + runAnalysis
    const t1 = setInterval(updateCountdown, 1000)

    // Market data refresh every 5 min（只更新數字顯示，不重算訊號）
    const t2 = setInterval(async () => {
      await loadMarketData()
      // 注意：loadMarketData 後不呼叫 runAnalysis
      // 訊號只在 K線收盤（updateCountdown 裡的 loadKlines）時才重算
    }, 300000)

    // Fear & greed 緩慢漂移（純顯示用，不影響訊號計算）
    const t3 = setInterval(() => {
      fearGreed.value = Math.max(5, Math.min(95, fearGreed.value + Math.round((Math.random() - 0.5) * 1)))
    }, 30000)

    // ❌ 移除 t4（每 60 秒強制重算），訊號只跟 K線走
    timers.push(t1, t2, t3)
  })

  onUnmounted(() => {
    timers.forEach(clearInterval)
    stopSimulation()
    if (priceWS) priceWS.close()
  })

  return {
    symbol, timeframe, price, priceDir, change24h, volume24h,
    fundingRate, openInterest, lsRatio, indexPrice, fearGreed,
    isLive, loading, klines, closes,
    indicators, signal, bulls, bears,
    tradePlan, mtfSignals,
    signalLog, toast,
    position,
    nextUpdate,
    fp, fb, changeSymbol, changeTimeframe,
    openPosition, closePosition, runAnalysis,
  }
}
