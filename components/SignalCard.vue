<template>
  <div class="sig-card" :class="signal.cls">
    <div v-if="loading" class="sig-loading">
      <div class="spinner" /><span>分析中...</span>
    </div>
    <template v-else>
      <!-- Top row -->
      <div class="sig-top">
        <div class="sig-icon">{{ signal.arrow }}</div>
        <div class="sig-main">
          <div class="sig-label">{{ signal.label }}</div>
          <div class="sig-meta">信心度 {{ signal.conf }}% · {{ signal.strength }}</div>
          <div class="sig-bar-wrap">
            <div class="sig-bar-fill" :style="{ width: signal.conf + '%' }" />
          </div>
        </div>
      </div>

      <!-- Reasons -->
      <div class="sig-reasons">
        <div v-for="r in signal.reasons" :key="r.text" class="sig-reason">
          <span class="sig-dot" :style="{ background: r.color }" />
          <span>{{ r.text }}</span>
        </div>
      </div>

      <!-- Levels -->
      <div class="sig-levels">
        <div class="sig-lev">
          <div class="sig-lev-label">建議入場</div>
          <div class="sig-lev-val entry">${{ fp(signal.entry) }}</div>
        </div>
        <div class="sig-lev">
          <div class="sig-lev-label">目標止盈</div>
          <div class="sig-lev-val tp">${{ fp(signal.tp) }}</div>
        </div>
        <div class="sig-lev">
          <div class="sig-lev-label">建議止損</div>
          <div class="sig-lev-val sl">${{ fp(signal.sl) }}</div>
        </div>
      </div>

      <!-- Next update -->
      <div class="sig-next">
        <span class="sig-next-dot" />
        下次K線更新：{{ nextUpdate }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Signal } from '~/types'

defineProps<{
  signal: Signal
  loading: boolean
  nextUpdate: string
  fp: (v: number) => string
}>()
</script>

<style scoped>
.sig-card {
  border: 2px solid var(--border);
  padding: 18px;
  position: relative;
  overflow: hidden;
  transition: all .5s;
}
.sig-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.sig-card.long {
  border-color: rgba(0,255,136,.55);
  background: rgba(0,255,136,.04);
  box-shadow: 0 0 30px rgba(0,255,136,.06);
}
.sig-card.long::before { background: linear-gradient(90deg, transparent, var(--green), transparent); }
.sig-card.short {
  border-color: rgba(255,51,102,.55);
  background: rgba(255,51,102,.04);
  box-shadow: 0 0 30px rgba(255,51,102,.06);
}
.sig-card.short::before { background: linear-gradient(90deg, transparent, var(--red), transparent); }
.sig-card.wait {
  border-color: rgba(255,215,0,.4);
  background: rgba(255,215,0,.02);
}
.sig-card.wait::before { background: linear-gradient(90deg, transparent, var(--yellow), transparent); }

.sig-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--dim);
  font-size: 1rem;
  padding: 20px 0;
}
.spinner {
  width: 18px; height: 18px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

.sig-top {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}
.sig-icon {
  font-size: 2.4rem;
  line-height: 1;
}
.long .sig-icon, .short .sig-icon { animation: pulse 1.8s ease-in-out infinite; }

.sig-label {
  font-family: var(--mono);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 3px;
}
.long .sig-label { color: var(--green); text-shadow: 0 0 20px rgba(0,255,136,.5); }
.short .sig-label { color: var(--red); text-shadow: 0 0 20px rgba(255,51,102,.5); }
.wait .sig-label { color: var(--yellow); }

.sig-meta {
  font-size: 0.85rem;
  letter-spacing: 1px;
  color: var(--dim);
  margin-top: 4px;
}
.sig-bar-wrap {
  height: 3px;
  background: var(--border);
  margin-top: 7px;
  overflow: hidden;
}
.sig-bar-fill {
  height: 100%;
  transition: width .8s;
}
.long .sig-bar-fill { background: var(--green); box-shadow: 0 0 8px var(--green); }
.short .sig-bar-fill { background: var(--red); box-shadow: 0 0 8px var(--red); }
.wait .sig-bar-fill { background: var(--yellow); }

.sig-reasons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-bottom: 14px;
}
.sig-reason {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  padding: 5px 8px;
  background: rgba(0,0,0,.2);
  color: var(--text);
}
.sig-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sig-levels {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}
.sig-lev {
  padding: 8px 10px;
  background: rgba(0,0,0,.3);
  border: 1px solid var(--border);
  text-align: center;
}
.sig-lev-label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: var(--dim);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.sig-lev-val {
  font-family: var(--mono);
  font-size: 0.9rem;
}
.sig-lev-val.entry { color: var(--accent); }
.sig-lev-val.tp { color: var(--green); }
.sig-lev-val.sl { color: var(--red); }

.sig-next {
  margin-top: 10px;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--dim);
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.sig-next-dot {
  width: 5px; height: 5px;
  background: var(--accent);
  border-radius: 50%;
  animation: blink 1.5s ease-in-out infinite;
}
</style>
