<template>
  <div class="chart-outer">
    <div v-if="!props.klines || props.klines.length === 0" class="chart-loading">
      <span class="spin" />載入K線中...
    </div>
    <svg v-else
      :viewBox="`0 0 1000 ${PH + VH + 24}`"
      preserveAspectRatio="xMidYMid meet"
      class="chart-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="priceClip">
          <rect :x="PL" y="0" :width="CW" :height="PH" />
        </clipPath>
        <clipPath id="volClip">
          <rect :x="PL" :y="PH + 2" :width="CW" :height="VH" />
        </clipPath>
      </defs>

      <!-- === PRICE AREA === -->
      <!-- Background -->
      <rect x="0" y="0" width="1000" :height="PH" fill="#0d1421" />

      <!-- Grid lines -->
      <g v-for="i in 5" :key="'g'+i">
        <line
          :x1="PL" :y1="gridY(i)" :x2="PL + CW" :y2="gridY(i)"
          stroke="#1a2d4a" stroke-width="0.5" stroke-dasharray="3,4"
        />
        <text
          :x="PL + CW + 6" :y="gridY(i) + 4"
          font-size="14" fill="#4a6080" font-family="monospace" text-anchor="start"
        >{{ fmtP(gridPrice(i)) }}</text>
      </g>

      <!-- Candles (clipped) -->
      <g clip-path="url(#priceClip)">
        <g v-for="(k, i) in safeKlines" :key="'c'+i">
          <!-- Wick -->
          <line
            :x1="cX(i)" :y1="pY(k.high)"
            :x2="cX(i)" :y2="pY(k.low)"
            :stroke="k.close >= k.open ? '#00ff88' : '#ff3366'"
            stroke-width="1"
          />
          <!-- Body -->
          <rect
            :x="cX(i) - bW/2"
            :y="pY(Math.max(k.open, k.close))"
            :width="bW"
            :height="Math.max(Math.abs(pY(k.open) - pY(k.close)), 1)"
            :fill="k.close >= k.open ? 'none' : '#ff3366'"
            :stroke="k.close >= k.open ? '#00ff88' : '#ff3366'"
            stroke-width="1"
          />
        </g>
      </g>

      <!-- Current price line -->
      <line v-if="safeKlines.length"
        :x1="PL" :y1="pY(lastClose)"
        :x2="PL + CW" :y2="pY(lastClose)"
        :stroke="lastClose >= safeKlines[0].close ? '#00ff88' : '#ff3366'"
        stroke-width="1" stroke-dasharray="4,3"
      />
      <text v-if="safeKlines.length"
        :x="PL + CW + 6" :y="pY(lastClose) + 5"
        font-size="14" :fill="lastClose >= safeKlines[0].close ? '#00ff88' : '#ff3366'"
        font-family="monospace" font-weight="bold"
      >${{ Math.round(lastClose).toLocaleString() }}</text>

      <!-- === VOLUME AREA === -->
      <rect x="0" :y="PH + 2" width="1000" :height="VH + 22" fill="#090e18" />

      <!-- VOL label -->
      <text :x="PL" :y="PH + 16" font-size="12" fill="#4a6080" font-family="monospace">VOL</text>
      <text :x="PL + CW + 6" :y="PH + 16" font-size="12" fill="#4a6080" font-family="monospace">{{ fmtV(volMax) }}</text>

      <!-- Volume bars (clipped) -->
      <g clip-path="url(#volClip)">
        <rect
          v-for="(k, i) in safeKlines" :key="'v'+i"
          :x="cX(i) - bW/2"
          :y="PH + 2 + VH - vH(k.volume)"
          :width="bW"
          :height="vH(k.volume)"
          :fill="k.close >= k.open ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,102,0.5)'"
        />
      </g>

      <!-- Vol MA20 -->
      <polyline v-if="volMA.length"
        :points="volMA.map((y, i) => `${cX(i + 19)},${y}`).join(' ')"
        fill="none" stroke="rgba(255,215,0,0.7)" stroke-width="1"
      />

      <!-- === DATE AXIS === -->
      <rect x="0" :y="PH + VH + 4" width="1000" height="20" fill="#080c14" />
      <g v-for="(lb, i) in dateLabels" :key="'d'+i">
        <text
          :x="lb.x" :y="PH + VH + 18"
          font-size="12" fill="#4a6080" font-family="monospace" text-anchor="middle"
        >{{ lb.text }}</text>
      </g>

    </svg>
  </div>
</template>

<script setup lang="ts">
import type { Kline, Timeframe } from '~/types'

const props = defineProps<{
  closes: number[]
  klines: Kline[]
  timeframe: Timeframe
}>()

// Layout constants (SVG coordinate space = 1000px wide)
const PH = 280   // price area height
const VH = 56    // volume area height
const PL = 6     // padding left
const PR = 90    // padding right (加寬給大字)
const CW = 1000 - PL - PR  // chart width

const safeKlines = computed(() => {
  const k = props.klines
  return Array.isArray(k) && k.length > 0 ? k : []
})
const n = computed(() => safeKlines.value.length)

// Price range
const yMax = computed(() => n.value ? Math.max(...safeKlines.value.map(k => k.high)) * 1.001 : 1)
const yMin = computed(() => n.value ? Math.min(...safeKlines.value.map(k => k.low)) * 0.999 : 0)
const yRng = computed(() => Math.max(yMax.value - yMin.value, 1))

// Volume range
const volMax = computed(() => n.value ? Math.max(...safeKlines.value.map(k => k.volume), 1) : 1)

// Last close
const lastClose = computed(() => safeKlines.value.length ? safeKlines.value[safeKlines.value.length - 1].close : 0)

// Candle bar width
const bW = computed(() => n.value > 1 ? Math.max(CW / n.value * 0.65, 1) : 4)

// X position of candle i
function cX(i: number) {
  if (n.value < 2) return PL
  return PL + (i / (n.value - 1)) * CW
}

// Y position of price p
function pY(p: number) {
  return 8 + (1 - (p - yMin.value) / yRng.value) * (PH - 16)
}

// Volume bar height
function vH(v: number) {
  return Math.max((v / volMax.value) * (VH - 4), 1)
}

// Grid
function gridY(i: number) { return 8 + (i / 5) * (PH - 16) }
function gridPrice(i: number) { return yMax.value - (i / 5) * yRng.value }

// Format helpers
function fmtP(v: number) {
  return v >= 1000 ? '$' + Math.round(v).toLocaleString() : '$' + v.toFixed(2)
}
function fmtV(v: number) {
  return v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : v.toFixed(0)
}

// Volume MA20
const volMA = computed(() => {
  if (n.value < 20) return []
  const result: number[] = []
  for (let i = 19; i < n.value; i++) {
    const avg = safeKlines.value.slice(i - 19, i + 1).reduce((s, k) => s + k.volume, 0) / 20
    result.push(PH + 2 + VH - vH(avg))
  }
  return result
})

// Date labels
const dateLabels = computed(() => {
  if (n.value < 2) return []
  const labels: { x: number; text: string }[] = []
  const step = Math.max(Math.floor(n.value / 6), 1)
  const shown = new Set<string>()

  const fmt = (ts: number) => {
    const d = new Date(ts)
    const mo = d.getMonth() + 1, da = d.getDate()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    if (props.timeframe === '1d') return `${mo}/${da}`
    if (['12h','8h','4h'].includes(props.timeframe)) return `${mo}/${da} ${hh}h`
    return `${mo}/${da} ${hh}:${mm}`
  }

  for (let i = 0; i < n.value; i += step) {
    const text = fmt(safeKlines.value[i].openTime)
    if (shown.has(text)) continue
    shown.add(text)
    labels.push({ x: cX(i), text })
  }
  // Always last
  const lastText = fmt(safeKlines.value[n.value - 1].openTime)
  if (!shown.has(lastText)) labels.push({ x: cX(n.value - 1), text: lastText })
  return labels
})
</script>

<style scoped>
.chart-outer { width: 100%; }
.chart-svg { width: 100%; height: auto; display: block; }
.chart-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4a6080;
  font-size: 0.9rem;
  font-family: monospace;
  padding: 40px 20px;
  height: 200px;
  justify-content: center;
}
.spin {
  width: 16px; height: 16px;
  border: 2px solid #1a2d4a;
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin .8s linear infinite;
  display: inline-block;
}
</style>
