<template>
  <div class="lev-wrap">
    <div class="lev-grid">
      <div class="ig">
        <label class="il">入場價 (USDT)</label>
        <input class="ifield" type="number" v-model.number="ep" @input="calc" />
      </div>
      <div class="ig">
        <label class="il">保證金 (USDT)</label>
        <input class="ifield" type="number" v-model.number="mg" @input="calc" />
      </div>
      <div class="ig full">
        <label class="il">槓桿：<span class="lev-num">{{ lev }}x</span></label>
        <input type="range" min="1" max="125" v-model.number="lev" @input="calc" class="lev-range" />
        <div class="lev-marks">
          <span>1x</span><span>25x</span><span>50x</span><span>100x</span><span>125x</span>
        </div>
      </div>
      <div class="ig">
        <label class="il">方向</label>
        <select class="ifield" v-model="dir" @change="calc">
          <option value="long">做多 LONG</option>
          <option value="short">做空 SHORT</option>
        </select>
      </div>
    </div>

    <div class="res-grid">
      <div class="rc danger">
        <div class="rcl">爆倉價</div>
        <div class="rcv">$ {{ fp(liqP) }}</div>
      </div>
      <div class="rc">
        <div class="rcl">倉位大小</div>
        <div class="rcv">$ {{ fp(posSize) }}</div>
      </div>
      <div class="rc safe">
        <div class="rcl">止盈 (+2%)</div>
        <div class="rcv">$ {{ fp(tpPrice) }}</div>
      </div>
      <div class="rc danger">
        <div class="rcl">止損 (-0.8%)</div>
        <div class="rcv">$ {{ fp(slPrice) }}</div>
      </div>
      <div class="rc">
        <div class="rcl">最大獲利</div>
        <div class="rcv green">+$ {{ fp(maxProfit) }}</div>
      </div>
      <div class="rc">
        <div class="rcl">最大虧損</div>
        <div class="rcv red">-$ {{ fp(maxLoss) }}</div>
      </div>
    </div>

    <div v-if="lev >= 50" class="liq-warn">
      <span>⚡</span>
      <span>{{ lev }}x 高槓桿：價格波動 {{ (100 / lev).toFixed(2) }}% 即爆倉</span>
    </div>

    <!-- Sim open buttons -->
    <div v-if="!position.active" class="pos-btns">
      <button class="pos-btn long" @click="emit('open', 'long', ep || currentPrice, mg, lev)">▲ 模擬做多</button>
      <button class="pos-btn short" @click="emit('open', 'short', ep || currentPrice, mg, lev)">▼ 模擬做空</button>
    </div>

    <!-- Active position -->
    <div v-else class="pos-monitor">
      <div class="pos-top">
        <span class="pos-dir-badge" :class="position.dir">
          {{ position.dir === 'long' ? '🟢 做多' : '🔴 做空' }}
          @ ${{ fp(position.ep || 0) }}
        </span>
        <span class="pos-pnl" :class="(position.pnl || 0) >= 0 ? 'green' : 'red'">
          {{ (position.pnl || 0) >= 0 ? '+' : '' }}{{ (position.pnl || 0).toFixed(2) }}%
          <small>({{ (position.pnl || 0) >= 0 ? '+' : '' }}${{ fp(position.pusd || 0) }})</small>
        </span>
      </div>
      <div class="pos-bar-track">
        <div class="pos-bar-fill"
          :style="{
            width: Math.min(Math.abs(position.pnl || 0) / 2 * 100, 100) + '%',
            background: (position.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)'
          }" />
      </div>
      <div class="pos-bar-labels">
        <span>SL ${{ fp(position.sl || 0) }}</span>
        <span>進場 ${{ fp(position.ep || 0) }}</span>
        <span>TP ${{ fp(position.tp || 0) }}</span>
      </div>
      <div v-if="position.status" class="pos-status" :class="position.status">
        <span>{{ position.status === 'tp' ? '🎯' : '⛔' }}</span>
        <span>{{ position.msg }}</span>
      </div>
      <button class="pos-close" @click="emit('close')">◼ 平倉</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Position } from '~/types'

const props = defineProps<{
  currentPrice: number
  symbol: string
  position: Position
  fp: (v: number) => string
}>()

const emit = defineEmits<{
  open: [dir: 'long' | 'short', ep: number, mg: number, lev: number]
  close: []
}>()

const ep = ref(0)
const mg = ref(100)
const lev = ref(100)
const dir = ref<'long' | 'short'>('long')
const liqP = ref(0), posSize = ref(0), tpPrice = ref(0), slPrice = ref(0)
const maxProfit = ref(0), maxLoss = ref(0)

// 幣種切換時強制重置入場價
watch(() => props.symbol, () => {
  ep.value = 0
})

// 價格更新時，若入場價未手動設定則跟著更新
watch(() => props.currentPrice, (p) => {
  if (!ep.value) ep.value = Math.round(p)
  calc()
}, { immediate: true })

function calc() {
  const p = ep.value || props.currentPrice
  const l = lev.value, m = mg.value
  posSize.value = m * l
  if (dir.value === 'long') {
    liqP.value = p * (1 - 1 / l + 0.004 / l)
    tpPrice.value = p * 1.02
    slPrice.value = p * 0.992
  } else {
    liqP.value = p * (1 + 1 / l - 0.004 / l)
    tpPrice.value = p * 0.98
    slPrice.value = p * 1.008
  }
  maxProfit.value = m * l * 0.02
  maxLoss.value = m * l * 0.008
}
</script>

<style scoped>
.lev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.ig { display: flex; flex-direction: column; gap: 5px; }
.ig.full { grid-column: 1 / -1; }
.il { font-size: 0.8rem; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; }
.lev-num { color: var(--accent); font-family: var(--mono); font-size: 1rem; }
.ifield {
  background: rgba(0,212,255,.05);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--sans);
  font-size: 1rem;
  padding: 8px 10px;
  width: 100%;
  outline: none;
}
.ifield:focus { border-color: var(--accent); }
.lev-range {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border);
  outline: none;
  margin-top: 8px;
}
.lev-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px; height: 18px;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  cursor: pointer;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}
.lev-marks {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--dim);
  margin-top: 3px;
}
.res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 10px; }
.rc { background: rgba(0,0,0,.3); border: 1px solid var(--border); padding: 9px 11px; }
.rc.danger { border-color: rgba(255,51,102,.4); background: rgba(255,51,102,.05); }
.rc.safe { border-color: rgba(0,255,136,.3); background: rgba(0,255,136,.05); }
.rcl { font-size: 0.72rem; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; margin-bottom: 3px; }
.rcv { font-family: var(--mono); font-size: 0.95rem; }
.rc.danger .rcv { color: var(--red); }
.rc.safe .rcv { color: var(--green); }
.green { color: var(--green); }
.red { color: var(--red); }

.liq-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,51,102,.07);
  border-left: 3px solid var(--red);
  font-size: 0.85rem;
  font-family: var(--mono);
  margin-bottom: 10px;
}
.pos-btns { display: flex; gap: 8px; }
.pos-btn {
  flex: 1;
  font-family: var(--sans);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 2px;
  padding: 10px;
  cursor: pointer;
  border: 1px solid;
  background: transparent;
  transition: all .2s;
}
.pos-btn.long { color: var(--green); border-color: rgba(0,255,136,.35); background: rgba(0,255,136,.07); }
.pos-btn.short { color: var(--red); border-color: rgba(255,51,102,.35); background: rgba(255,51,102,.07); }
.pos-btn:hover { filter: brightness(1.2); }

.pos-monitor { margin-top: 10px; }
.pos-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.pos-dir-badge { font-family: var(--mono); font-size: 0.9rem; }
.pos-pnl { font-family: var(--mono); font-size: 1.2rem; font-weight: 700; }
.pos-pnl small { font-size: 0.85rem; }
.pos-bar-track { height: 5px; background: var(--border); overflow: hidden; margin-bottom: 4px; }
.pos-bar-fill { height: 100%; transition: width .5s; }
.pos-bar-labels { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--dim); margin-bottom: 8px; }
.pos-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-left: 3px solid;
  font-size: 0.85rem;
  font-family: var(--mono);
  margin-bottom: 8px;
}
.pos-status.tp { background: rgba(0,255,136,.05); border-color: var(--green); }
.pos-status.sl { background: rgba(255,51,102,.07); border-color: var(--red); }
.pos-close {
  width: 100%;
  font-family: var(--sans);
  font-size: 1rem;
  letter-spacing: 2px;
  padding: 9px;
  cursor: pointer;
  border: 1px solid rgba(255,51,102,.4);
  color: var(--red);
  background: rgba(255,51,102,.07);
}
</style>
