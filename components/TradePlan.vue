<template>
  <div class="tp-wrap">

    <!-- MTF 多時間框架確認 -->
    <div class="panel mtf-panel">
      <div class="ptitle">多時間框架確認</div>
      <div class="mtf-grid">
        <div
          v-for="m in mtfSignals" :key="m.timeframe"
          class="mtf-item"
          :class="m.cls"
        >
          <div class="mtf-tf">{{ tfLabel(m.timeframe) }}</div>
          <div class="mtf-arrow">{{ m.cls === 'long' ? '▲' : m.cls === 'short' ? '▼' : '◈' }}</div>
          <div class="mtf-label">{{ m.label }}</div>
          <div class="mtf-conf" v-if="m.conf > 0">{{ m.conf }}%</div>
        </div>
        <div v-if="!mtfSignals.length" class="mtf-loading">
          <span class="spin" />載入中...
        </div>
      </div>
      <!-- MTF 一致性提示 -->
      <div class="mtf-summary" :class="mtfConsistency.cls">
        {{ mtfConsistency.text }}
      </div>
    </div>

    <!-- 交易計畫 -->
    <div class="panel plan-panel" v-if="plan">
      <div class="ptitle">📋 交易計畫</div>

      <!-- 趨勢方向 -->
      <div class="plan-trend">
        <span class="plan-trend-label">主趨勢</span>
        <span class="plan-trend-val" :style="{ color: plan.trend.includes('多') ? 'var(--green)' : 'var(--red)' }">
          {{ plan.trend }}
        </span>
        <span class="plan-atr">ATR：{{ fp(plan.atr) }}</span>
      </div>

      <!-- 等待提示 or 進場提示 -->
      <div v-if="plan.waitReason" class="plan-wait">
        ⏳ {{ plan.waitReason }}
      </div>
      <div v-else-if="plan.entryReason" class="plan-entry-ok">
        ✅ {{ plan.entryReason }}
      </div>

      <!-- 進場區間 -->
      <div class="plan-zone" v-if="plan.direction !== 'wait'">
        <div class="plan-zone-label">建議等待進場區</div>
        <div class="plan-zone-val">
          ${{ fp(plan.entryZone.low) }} — ${{ fp(plan.entryZone.high) }}
        </div>
      </div>

      <!-- SL / TP 表格 -->
      <div class="plan-grid">
        <div class="plan-card sl-card">
          <div class="plan-card-label">建議止損</div>
          <div class="plan-card-val red">${{ fp(plan.sl) }}</div>
          <div class="plan-card-sub">ATR 動態止損</div>
        </div>
        <div class="plan-card tp1-card">
          <div class="plan-card-label">止盈目標 1</div>
          <div class="plan-card-val green">${{ fp(plan.tp1) }}</div>
          <div class="plan-card-sub">2× ATR</div>
        </div>
        <div class="plan-card tp2-card">
          <div class="plan-card-label">止盈目標 2</div>
          <div class="plan-card-val accent">${{ fp(plan.tp2) }}</div>
          <div class="plan-card-sub">布林上軌</div>
        </div>
      </div>

      <!-- 盈虧比 -->
      <div class="rr-section">
        <div class="rr-title">盈虧比計算（以進場區中點為基準）</div>
        <div class="rr-ref">進場點參考：${{ fp((plan.entryZone.low + plan.entryZone.high) / 2) }}</div>
        <div class="rr-row">
          <div class="rr-item">
            <span class="rr-label">風險</span>
            <span class="rr-val red">-${{ fp(plan.risk) }}</span>
          </div>
          <div class="rr-divider">vs</div>
          <div class="rr-item">
            <span class="rr-label">止盈1 報酬</span>
            <span class="rr-val green">+${{ fp(plan.reward1) }}</span>
          </div>
          <div class="rr-badge" :class="parseFloat(plan.rr1) >= 2 ? 'good' : parseFloat(plan.rr1) >= 1.5 ? 'ok' : 'bad'">
            R:R = 1:{{ plan.rr1 }}
          </div>
        </div>
        <div class="rr-row">
          <div class="rr-item">
            <span class="rr-label">風險</span>
            <span class="rr-val red">-${{ fp(plan.risk) }}</span>
          </div>
          <div class="rr-divider">vs</div>
          <div class="rr-item">
            <span class="rr-label">止盈2 報酬</span>
            <span class="rr-val accent">+${{ fp(plan.reward2) }}</span>
          </div>
          <div class="rr-badge" :class="parseFloat(plan.rr2) >= 2 ? 'good' : parseFloat(plan.rr2) >= 1.5 ? 'ok' : 'bad'">
            R:R = 1:{{ plan.rr2 }}
          </div>
        </div>
      </div>

      <!-- 建議摘要 -->
      <div class="plan-summary" :class="plan.direction">
        <span class="plan-sum-icon">{{ plan.direction === 'long' ? '▲' : plan.direction === 'short' ? '▼' : '◈' }}</span>
        <span class="plan-sum-text">{{ summaryText }}</span>
      </div>
    </div>

    <div v-else class="panel" style="padding: 20px; text-align: center; color: var(--dim); font-size: 0.9rem;">
      <span class="spin" /> 分析中...
    </div>

  </div>
</template>

<script setup lang="ts">
import type { TradePlan, MTFSignal } from '~/types'

const props = defineProps<{
  plan: TradePlan | null
  mtfSignals: MTFSignal[]
  fp: (v: number) => string
}>()

function tfLabel(tf: string) {
  const map: Record<string, string> = {
    '15m': '15分', '1h': '1H', '4h': '4H',
    '8h': '8H', '12h': '12H', '1d': '日線'
  }
  return map[tf] || tf
}

const mtfConsistency = computed(() => {
  const sigs = props.mtfSignals
  if (!sigs.length) return { cls: '', text: '' }
  const longs = sigs.filter(s => s.cls === 'long').length
  const shorts = sigs.filter(s => s.cls === 'short').length
  const total = sigs.length
  if (longs === total) return { cls: 'all-long', text: '✅ 全週期做多一致 — 高信心進場' }
  if (shorts === total) return { cls: 'all-short', text: '✅ 全週期做空一致 — 高信心進場' }
  if (longs > shorts) return { cls: 'mostly-long', text: '⚠ 多數週期偏多，仍有矛盾，謹慎進場' }
  if (shorts > longs) return { cls: 'mostly-short', text: '⚠ 多數週期偏空，仍有矛盾，謹慎進場' }
  return { cls: 'mixed', text: '❌ 多空分歧，建議觀望' }
})

const summaryText = computed(() => {
  const p = props.plan
  if (!p) return ''
  if (p.direction === 'wait') return '目前訊號混雜，等待明確方向'
  const dir = p.direction === 'long' ? '做多' : '做空'
  if (p.waitReason) return `方向 ${dir}，但勿追價，等回測進場區再進`
  return `可${dir}，R:R = 1:${p.rr1}，止損 $${props.fp(p.sl)}`
})
</script>

<style scoped>
.tp-wrap { display: flex; flex-direction: column; gap: 12px; }
.panel { background: var(--panel); border: 1px solid var(--border); padding: 14px; }
.ptitle { font-size: 0.8rem; letter-spacing: 3px; color: var(--dim); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; }
.ptitle::before { content: ''; width: 5px; height: 5px; background: var(--accent); box-shadow: 0 0 7px var(--accent); display: inline-block; flex-shrink: 0; }

/* MTF */
.mtf-grid { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.mtf-item {
  flex: 1; min-width: 70px;
  padding: 8px 6px;
  border: 1px solid var(--border);
  text-align: center;
  background: rgba(0,0,0,.2);
}
.mtf-item.long { border-color: rgba(0,255,136,.4); background: rgba(0,255,136,.05); }
.mtf-item.short { border-color: rgba(255,51,102,.4); background: rgba(255,51,102,.05); }
.mtf-item.wait { border-color: rgba(255,215,0,.3); background: rgba(255,215,0,.02); }
.mtf-tf { font-size: 0.75rem; color: var(--dim); margin-bottom: 3px; letter-spacing: 1px; }
.mtf-arrow { font-size: 1.2rem; line-height: 1.2; }
.long .mtf-arrow { color: var(--green); }
.short .mtf-arrow { color: var(--red); }
.wait .mtf-arrow { color: var(--yellow); }
.mtf-label { font-size: 0.7rem; color: var(--text); margin-top: 2px; }
.mtf-conf { font-size: 0.65rem; color: var(--dim); margin-top: 1px; font-family: var(--mono); }
.mtf-loading { display: flex; align-items: center; gap: 8px; color: var(--dim); font-size: 0.85rem; padding: 8px; }
.spin { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; display: inline-block; }

.mtf-summary {
  font-size: 0.85rem;
  padding: 7px 10px;
  border-left: 3px solid var(--dim);
  font-family: var(--mono);
}
.all-long { border-left-color: var(--green); color: var(--green); background: rgba(0,255,136,.05); }
.all-short { border-left-color: var(--red); color: var(--red); background: rgba(255,51,102,.05); }
.mostly-long { border-left-color: var(--yellow); color: var(--yellow); }
.mostly-short { border-left-color: var(--yellow); color: var(--yellow); }
.mixed { border-left-color: var(--dim); color: var(--dim); }

/* Trade Plan */
.plan-trend { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.plan-trend-label { font-size: 0.8rem; color: var(--dim); }
.plan-trend-val { font-size: 1rem; font-weight: 700; font-family: var(--mono); }
.plan-atr { font-size: 0.75rem; color: var(--dim); margin-left: auto; font-family: var(--mono); }

.plan-wait {
  font-size: 0.85rem;
  color: var(--yellow);
  background: rgba(255,215,0,.05);
  border-left: 3px solid var(--yellow);
  padding: 8px 10px;
  margin-bottom: 10px;
  font-family: var(--mono);
}
.plan-entry-ok {
  font-size: 0.85rem;
  color: var(--green);
  background: rgba(0,255,136,.05);
  border-left: 3px solid var(--green);
  padding: 8px 10px;
  margin-bottom: 10px;
  font-family: var(--mono);
}

.plan-zone { margin-bottom: 12px; }
.plan-zone-label { font-size: 0.75rem; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; margin-bottom: 4px; }
.plan-zone-val { font-family: var(--mono); font-size: 1rem; color: var(--accent); }

.plan-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.plan-card { padding: 8px 10px; background: rgba(0,0,0,.3); border: 1px solid var(--border); }
.sl-card { border-color: rgba(255,51,102,.3); background: rgba(255,51,102,.05); }
.tp1-card { border-color: rgba(0,255,136,.3); background: rgba(0,255,136,.04); }
.tp2-card { border-color: rgba(0,212,255,.3); background: rgba(0,212,255,.04); }
.plan-card-label { font-size: 0.7rem; letter-spacing: 1px; color: var(--dim); text-transform: uppercase; margin-bottom: 4px; }
.plan-card-val { font-family: var(--mono); font-size: 0.95rem; font-weight: 700; }
.plan-card-sub { font-size: 0.65rem; color: var(--dim); margin-top: 2px; }
.red { color: var(--red); }
.green { color: var(--green); }
.accent { color: var(--accent); }

.rr-section { margin-bottom: 10px; }
.rr-title { font-size: 0.72rem; letter-spacing: 1px; color: var(--dim); margin-bottom: 4px; text-transform: uppercase; }
.rr-ref { font-family: var(--mono); font-size: 0.85rem; color: var(--accent); margin-bottom: 8px; }
.rr-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.rr-item { display: flex; flex-direction: column; gap: 1px; }
.rr-label { font-size: 0.7rem; color: var(--dim); }
.rr-val { font-family: var(--mono); font-size: 0.9rem; font-weight: 700; }
.rr-divider { color: var(--dim); font-size: 1rem; }
.rr-badge { font-family: var(--mono); font-size: 0.8rem; padding: 3px 10px; border: 1px solid; margin-left: auto; }
.rr-badge.good { color: var(--green); border-color: rgba(0,255,136,.4); background: rgba(0,255,136,.08); }
.rr-badge.ok { color: var(--yellow); border-color: rgba(255,215,0,.4); background: rgba(255,215,0,.06); }
.rr-badge.bad { color: var(--red); border-color: rgba(255,51,102,.4); background: rgba(255,51,102,.06); }

.plan-summary {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  margin-top: 10px;
  font-family: var(--mono);
  font-size: 0.85rem;
}
.plan-summary.long { border-color: rgba(0,255,136,.4); background: rgba(0,255,136,.05); color: var(--green); }
.plan-summary.short { border-color: rgba(255,51,102,.4); background: rgba(255,51,102,.05); color: var(--red); }
.plan-summary.wait { border-color: rgba(255,215,0,.3); background: rgba(255,215,0,.03); color: var(--yellow); }
.plan-sum-icon { font-size: 1.1rem; }
</style>
