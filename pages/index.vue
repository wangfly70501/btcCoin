<template>
  <div class="page">

    <!-- ── HEADER ── -->
    <header class="hdr">
      <div class="hdr-inner">
        <div class="hdr-l">
          <div class="logo">⬡ APEX</div>
          <SymbolSelector :model-value="symbol" @update:modelValue="changeSymbol" />
          <TimeframeSelector :model-value="timeframe" @update:modelValue="changeTimeframe" />
          <div class="live-badge">
            <span class="dot" :class="isLive ? 'live' : 'sim'" />
            <span>{{ isLive ? 'LIVE' : 'SIM' }}</span>
          </div>
        </div>

        <div class="hdr-r">
          <div class="price-block">
            <div class="price-val" :class="priceDir">
              ${{ fp(price) }}
            </div>
            <div class="price-chg" :style="{ color: change24h >= 0 ? 'var(--green)' : 'var(--red)' }">
              {{ change24h >= 0 ? '▲' : '▼' }} {{ Math.abs(change24h).toFixed(2) }}% 24H
            </div>
          </div>
        </div>
      </div>
      <div class="hdr-scan" />
    </header>

    <!-- ── STATUS BAR ── -->
    <div class="sbar">
      <div class="chip" :style="{ '--cc': fundingRate >= 0 ? 'var(--green)' : 'var(--red)', '--f': '60%' }">
        <div class="clabel">資金費率</div>
        <div class="cval" :style="{ color: fundingRate >= 0 ? 'var(--green)' : 'var(--red)' }">
          {{ fundingRate >= 0 ? '+' : '' }}{{ fundingRate.toFixed(4) }}%
        </div>
      </div>
      <div class="chip" style="--cc:var(--yellow);--f:45%">
        <div class="clabel">未平倉量 OI</div>
        <div class="cval">${{ fb(openInterest) }}</div>
      </div>
      <div class="chip" :style="{ '--cc': lsRatio > 1 ? 'var(--green)' : 'var(--red)', '--f': Math.min(lsRatio * 40, 90) + '%' }">
        <div class="clabel">多空比 L/S</div>
        <div class="cval" :style="{ color: lsRatio > 1 ? 'var(--green)' : 'var(--red)' }">
          {{ lsRatio.toFixed(3) }}
        </div>
      </div>
      <div class="chip" style="--cc:var(--accent);--f:55%">
        <div class="clabel">指數價格</div>
        <div class="cval">${{ fp(indexPrice) }}</div>
      </div>
      <div class="chip" style="--cc:var(--green);--f:65%">
        <div class="clabel">24H 成交量</div>
        <div class="cval">${{ fb(volume24h) }}</div>
      </div>
    </div>

    <!-- ── MAIN GRID ── -->
    <div class="main-grid">

      <!-- LEFT COL -->
      <div class="left-col">

        <!-- Signal -->
        <div class="panel">
          <div class="ptitle">📊 {{ symbol }} · {{ tfLabel }} 訊號分析</div>
          <SignalCard
            :signal="signal"
            :loading="loading"
            :next-update="nextUpdate"
            :fp="fp"
          />
        </div>

        <!-- Chart -->
        <div class="panel">
          <div class="ptitle">蠟燭圖 · {{ tfLabel }} (近100根)</div>
          <PriceChart :closes="closes" :klines="klines" :timeframe="timeframe" />
        </div>

        <!-- Indicators -->
        <div class="panel">
          <div class="ptitle">技術指標 (基於{{ tfLabel }}K線)</div>
          <div v-if="loading" class="loading-row">
            <div class="spinner" /><span>計算中...</span>
          </div>
          <template v-else>
            <div class="ind-table">
              <div class="ind-row" v-for="ind in indicators" :key="ind.name">
                <span class="ind-name">{{ ind.name }}</span>
                <span class="ind-val" :style="{ color: ind.color }">{{ ind.value }}</span>
                <span class="ind-badge" :class="ind.signal">{{ ind.signal === 'long' ? '多' : ind.signal === 'short' ? '空' : '中' }}</span>
              </div>
            </div>
            <!-- Signal strength bar -->
            <div class="str-wrap">
              <div class="str-label">綜合訊號強度</div>
              <div class="str-bar">
                <div
                  v-for="i in 10" :key="i"
                  class="str-seg"
                  :class="i <= bears ? 'bear' : i > (10 - bulls) ? 'bull' : ''"
                />
              </div>
              <div class="str-marks">
                <span>強力空</span><span>中立</span><span>強力多</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Signal Log -->
        <div class="panel">
          <div class="ptitle">訊號紀錄</div>
          <div class="log-list">
            <div
              v-for="l in signalLog" :key="l.id"
              class="log-row"
              :class="l.type"
            >
              <span class="log-time">{{ l.time }}</span>
              <span>{{ l.icon }}</span>
              <span class="log-msg">{{ l.msg }}</span>
              <span class="log-px">${{ fp(l.px) }}</span>
            </div>
            <div v-if="!signalLog.length" class="log-empty">等待訊號中...</div>
          </div>
        </div>

      </div>

      <!-- RIGHT COL -->
      <div class="right-col">

        <!-- Fear & Greed -->
        <div class="panel">
          <div class="ptitle">恐懼貪婪指數</div>
          <div class="gauge-wrap">
            <svg width="180" height="100" viewBox="0 0 180 100">
              <defs>
                <linearGradient id="gg">
                  <stop offset="0%" stop-color="#ff3366" />
                  <stop offset="50%" stop-color="#ffd700" />
                  <stop offset="100%" stop-color="#00ff88" />
                </linearGradient>
              </defs>
              <path d="M 18 88 A 72 72 0 0 1 162 88" fill="none" stroke="#1a2d4a" stroke-width="13" stroke-linecap="round" />
              <path d="M 18 88 A 72 72 0 0 1 162 88" fill="none" stroke="url(#gg)" stroke-width="13" stroke-linecap="round"
                stroke-dasharray="226" :stroke-dashoffset="226 - (fearGreed / 100) * 226" />
              <line
                :x2="90 + 64 * Math.cos(Math.PI - (fearGreed / 100) * Math.PI)"
                :y2="88 - 64 * Math.sin((fearGreed / 100) * Math.PI)"
                x1="90" y1="88" stroke="white" stroke-width="2" stroke-linecap="round" />
              <circle cx="90" cy="88" r="5" fill="white" />
              <text x="90" y="72" text-anchor="middle" font-size="22" font-family="monospace" font-weight="bold"
                :fill="fearGreed < 30 ? '#ff3366' : fearGreed > 70 ? '#00ff88' : '#ffd700'">
                {{ fearGreed }}
              </text>
              <text x="90" y="96" text-anchor="middle" font-size="9" fill="#4a6080" letter-spacing="2">{{ fgLabel }}</text>
            </svg>
          </div>
        </div>

        <!-- Leverage Calc -->
        <div class="panel">
          <div class="ptitle">槓桿風控計算</div>
          <LevCalc
            :current-price="price"
            :symbol="symbol"
            :position="position"
            :fp="fp"
            @open="(dir, ep, mg, lev) => openPosition(dir, ep, mg, lev)"
            @close="closePosition"
          />
        </div>

        <!-- Market Sentiment -->
        <div class="panel">
          <div class="ptitle">市場情緒</div>
          <div class="sent-list">
            <div v-for="s in sentimentData" :key="s.name" class="sent-row">
              <div class="sent-top">
                <span class="sent-name">{{ s.name }}</span>
                <span class="sent-val" :style="{ color: s.color }">{{ s.val }}</span>
              </div>
              <div class="sent-bar">
                <div class="sent-fill" :style="{ width: s.pct + '%', background: s.color }" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── TOAST ── -->
    <Transition name="fade">
      <div v-if="toast.show" class="toast" :class="toast.type">
        {{ toast.msg }}
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
const {
  symbol, timeframe, price, priceDir, change24h, volume24h,
  fundingRate, openInterest, lsRatio, indexPrice, fearGreed,
  isLive, loading, klines, closes,
  indicators, signal, bulls, bears,
  signalLog, toast, position, nextUpdate,
  fp, fb, changeSymbol, changeTimeframe,
  openPosition, closePosition,
} = useTrading()

const fgLabel = computed(() => {
  const v = fearGreed.value
  return v < 20 ? 'EXTREME FEAR' : v < 40 ? 'FEAR' : v < 60 ? 'NEUTRAL' : v < 80 ? 'GREED' : 'EXTREME GREED'
})

const tfLabel = computed(() => {
  const map: Record<string, string> = {
    '15m': '15分鐘', '1h': '1小時', '4h': '4小時',
    '8h': '8小時', '12h': '12小時', '1d': '日線'
  }
  return map[timeframe.value] || timeframe.value
})

const sentimentData = computed(() => [
  {
    name: '多頭力道',
    val: (lsRatio.value > 1 ? lsRatio.value * 40 : 40).toFixed(1) + '%',
    pct: Math.min(lsRatio.value > 1 ? lsRatio.value * 40 : 40, 100),
    color: 'var(--green)'
  },
  {
    name: '空頭力道',
    val: (lsRatio.value < 1 ? (1 / lsRatio.value) * 40 : 40).toFixed(1) + '%',
    pct: Math.min(lsRatio.value < 1 ? (1 / lsRatio.value) * 40 : 40, 100),
    color: 'var(--red)'
  },
  {
    name: '波動率',
    val: (Math.abs(change24h.value) * 0.8 + 1.5).toFixed(2) + '%',
    pct: Math.min(Math.abs(change24h.value) * 8 + 15, 100),
    color: 'var(--yellow)'
  },
  {
    name: '資金費率壓力',
    val: Math.abs(fundingRate.value).toFixed(4) + '%',
    pct: Math.min(Math.abs(fundingRate.value) * 5000, 100),
    color: 'var(--accent)'
  },
])
</script>

<style scoped>
.page { position: relative; z-index: 1; min-height: 100vh; }

/* HEADER */
.hdr {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
.hdr-scan {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  animation: scanline 3s linear infinite;
}
.hdr-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.hdr-l { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.logo {
  font-family: var(--mono);
  font-size: 1.3rem;
  color: var(--accent);
  letter-spacing: 4px;
  text-shadow: 0 0 20px rgba(0,212,255,.5);
  white-space: nowrap;
}
.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--dim);
}
.dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  animation: blink 1.5s ease-in-out infinite;
}
.dot.live { background: var(--green); box-shadow: 0 0 8px var(--green); }
.dot.sim { background: var(--yellow); box-shadow: 0 0 8px var(--yellow); }

.price-block { text-align: right; }
.price-val {
  font-family: var(--mono);
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 2px;
  transition: color .3s;
}
.price-val.up { color: var(--green); text-shadow: 0 0 15px rgba(0,255,136,.4); }
.price-val.down { color: var(--red); text-shadow: 0 0 15px rgba(255,51,102,.4); }
.price-chg { font-family: var(--mono); font-size: 0.85rem; margin-top: 2px; }

/* STATUS BAR */
.sbar {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--border);
  background: rgba(13,20,33,.8);
}
.chip {
  flex: 1;
  min-width: 110px;
  background: var(--panel);
  border: 1px solid var(--border);
  padding: 9px 12px;
  position: relative;
}
.chip::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  width: var(--f, 50%);
  background: var(--cc, var(--accent));
  transition: width .8s;
}
.clabel { font-size: 0.72rem; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; margin-bottom: 3px; }
.cval { font-family: var(--mono); font-size: 1rem; }

/* MAIN GRID */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 14px;
  padding: 14px 16px;
  max-width: 1300px;
  margin: 0 auto;
}
.left-col, .right-col { display: flex; flex-direction: column; gap: 14px; }

/* PANEL */
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  padding: 16px;
}
.ptitle {
  font-size: 0.8rem;
  letter-spacing: 3px;
  color: var(--dim);
  text-transform: uppercase;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ptitle::before {
  content: '';
  width: 6px; height: 6px;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  display: inline-block;
  flex-shrink: 0;
}

/* INDICATORS */
.loading-row { display: flex; align-items: center; gap: 10px; color: var(--dim); font-size: 0.95rem; padding: 12px 0; }
.spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
.ind-table { display: flex; flex-direction: column; }
.ind-row { display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(26,45,74,.5); gap: 8px; }
.ind-row:last-child { border-bottom: none; }
.ind-name { font-size: 0.95rem; color: var(--dim); flex: 1; }
.ind-val { font-family: var(--mono); font-size: 0.95rem; min-width: 90px; text-align: right; }
.ind-badge { font-size: 0.7rem; letter-spacing: 2px; padding: 2px 8px; font-weight: 700; }
.ind-badge.long { background: rgba(0,255,136,.15); color: var(--green); border: 1px solid rgba(0,255,136,.3); }
.ind-badge.short { background: rgba(255,51,102,.15); color: var(--red); border: 1px solid rgba(255,51,102,.3); }
.ind-badge.neutral { background: rgba(255,215,0,.1); color: var(--yellow); border: 1px solid rgba(255,215,0,.3); }

.str-wrap { margin-top: 14px; }
.str-label { font-size: 0.75rem; letter-spacing: 2px; color: var(--dim); margin-bottom: 6px; }
.str-bar { display: flex; gap: 2px; }
.str-seg { flex: 1; height: 6px; background: var(--border); transition: background .5s; }
.str-seg.bull { background: var(--green); box-shadow: 0 0 6px var(--green); }
.str-seg.bear { background: var(--red); box-shadow: 0 0 6px var(--red); }
.str-marks { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--dim); margin-top: 4px; }

/* LOG */
.log-list { display: flex; flex-direction: column; gap: 3px; max-height: 160px; overflow-y: auto; }
.log-row { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 0.8rem; padding: 4px 8px; background: rgba(0,0,0,.2); border-left: 2px solid transparent; }
.log-row.l { border-left-color: var(--green); color: var(--green); }
.log-row.s { border-left-color: var(--red); color: var(--red); }
.log-row.t { border-left-color: var(--accent); color: var(--accent); }
.log-row.sl { border-left-color: var(--yellow); color: var(--yellow); }
.log-time { color: var(--dim); min-width: 62px; font-size: 0.75rem; }
.log-msg { flex: 1; }
.log-px { opacity: .7; }
.log-empty { font-size: 0.85rem; color: var(--dim); padding: 10px; text-align: center; }

/* GAUGE */
.gauge-wrap { display: flex; justify-content: center; padding: 6px 0; }

/* SENTIMENT */
.sent-list { display: flex; flex-direction: column; gap: 12px; }
.sent-row {}
.sent-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
.sent-name { font-size: 0.9rem; color: var(--dim); }
.sent-val { font-family: var(--mono); font-size: 0.9rem; }
.sent-bar { height: 4px; background: var(--border); overflow: hidden; }
.sent-fill { height: 100%; transition: width .8s; }

/* TOAST */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  font-family: var(--mono);
  font-size: 0.95rem;
  letter-spacing: 1px;
  z-index: 9999;
  border: 1px solid;
  min-width: 280px;
  text-align: center;
  animation: toastIn .4s cubic-bezier(.34, 1.56, .64, 1);
}
.toast.tp { background: rgba(0,255,136,.1); border-color: var(--green); color: var(--green); box-shadow: 0 0 40px rgba(0,255,136,.2); }
.toast.sl { background: rgba(255,51,102,.1); border-color: var(--red); color: var(--red); box-shadow: 0 0 40px rgba(255,51,102,.2); }
.toast.warn { background: rgba(255,215,0,.08); border-color: var(--yellow); color: var(--yellow); }
.toast.info { background: rgba(0,212,255,.08); border-color: var(--accent); color: var(--accent); }

/* RESPONSIVE */
@media (max-width: 900px) {
  .main-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .hdr-inner { padding: 8px 10px; }
  .price-val { font-size: 1.4rem; }
}
</style>
