import type { Kline, SymbolInfo } from '~/types'

const BASE = 'https://fapi.binance.com'

export function useBinance() {
  async function fetchPrice(symbol: string): Promise<{ price: number; change24h: number; volume: number } | null> {
    try {
      const r = await fetch(`${BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`)
      const d = await r.json()
      return {
        price: parseFloat(d.lastPrice),
        change24h: parseFloat(d.priceChangePercent),
        volume: parseFloat(d.quoteVolume),
      }
    } catch { return null }
  }

  async function fetchKlines(symbol: string, interval: string, limit = 100): Promise<Kline[]> {
    try {
      const r = await fetch(`${BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
      const data = await r.json()
      return data.map((k: any[]) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[7]),  // k[7] = Quote asset volume (USDT)，比 k[5] base volume 更直觀
        closeTime: k[6],
      }))
    } catch { return [] }
  }

  async function fetchFundingRate(symbol: string): Promise<number> {
    try {
      const r = await fetch(`${BASE}/fapi/v1/premiumIndex?symbol=${symbol}`)
      const d = await r.json()
      return parseFloat(d.lastFundingRate) * 100
    } catch { return 0 }
  }

  async function fetchOpenInterest(symbol: string): Promise<number> {
    try {
      const r = await fetch(`${BASE}/fapi/v1/openInterest?symbol=${symbol}`)
      const d = await r.json()
      return parseFloat(d.openInterest)
    } catch { return 0 }
  }

  async function fetchLSRatio(symbol: string): Promise<number> {
    try {
      const r = await fetch(`${BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`)
      const d = await r.json()
      return parseFloat(d[0]?.longShortRatio || '1')
    } catch { return 1 }
  }

  async function fetchAllSymbols(): Promise<SymbolInfo[]> {
    try {
      const r = await fetch(`${BASE}/fapi/v1/exchangeInfo`)
      const d = await r.json()
      return d.symbols
        .filter((s: any) => s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT' && s.status === 'TRADING')
        .map((s: any) => ({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
        }))
        .sort((a: SymbolInfo, b: SymbolInfo) => a.symbol.localeCompare(b.symbol))
    } catch { return [] }
  }

  function createPriceWS(symbol: string, onPrice: (price: number) => void): WebSocket {
    const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@miniTicker`)
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data)
      onPrice(parseFloat(d.c))
    }
    return ws
  }

  return {
    fetchPrice,
    fetchKlines,
    fetchFundingRate,
    fetchOpenInterest,
    fetchLSRatio,
    fetchAllSymbols,
    createPriceWS,
  }
}
