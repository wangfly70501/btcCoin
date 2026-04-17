<template>
  <div class="chart-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="chart-svg">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <!-- grid -->
      <line v-for="i in 4" :key="'h'+i"
        x1="0" :y1="H/4*i" :x2="W" :y2="H/4*i"
        stroke="#1a2d4a" stroke-width="0.5" />
      <!-- price labels -->
      <text v-for="i in 4" :key="'l'+i"
        :x="W - 3" :y="H/4*i - 3"
        font-size="9" fill="#4a6080" text-anchor="end" font-family="monospace">
        ${{ Math.round(yMax - (yRange / 4) * i).toLocaleString() }}
      </text>
      <!-- fill -->
      <path v-if="fillPath" :d="fillPath" fill="url(#chartGrad)" />
      <!-- line -->
      <path v-if="linePath" :d="linePath" :stroke="color" stroke-width="1.8" fill="none" />
      <!-- current dot -->
      <circle v-if="closes.length > 1"
        :cx="W" :cy="pY(closes[closes.length-1])" r="3.5" :fill="color"
        :style="`filter: drop-shadow(0 0 5px ${color})`" />
    </svg>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ closes: number[] }>()

const W = 600
const H = 200

const yMin = computed(() => props.closes.length ? Math.min(...props.closes) : 0)
const yMax = computed(() => props.closes.length ? Math.max(...props.closes) : 1)
const yRange = computed(() => Math.max(yMax.value - yMin.value, 1))

const color = computed(() => {
  if (props.closes.length < 2) return '#00d4ff'
  return props.closes[props.closes.length - 1] >= props.closes[0] ? '#00ff88' : '#ff3366'
})

function pY(p: number) {
  return H - ((p - yMin.value) / yRange.value) * (H - 24) - 6
}
function pX(i: number) {
  return props.closes.length < 2 ? 0 : (i / (props.closes.length - 1)) * W
}

const linePath = computed(() => {
  if (props.closes.length < 2) return ''
  return props.closes.map((p, i) => `${i === 0 ? 'M' : 'L'}${pX(i).toFixed(1)},${pY(p).toFixed(1)}`).join(' ')
})
const fillPath = computed(() => {
  if (props.closes.length < 2) return ''
  const last = props.closes.length - 1
  return linePath.value + ` L${pX(last).toFixed(1)},${H} L0,${H} Z`
})
</script>

<style scoped>
.chart-wrap { width: 100%; overflow: hidden; }
.chart-svg { width: 100%; height: 200px; display: block; }
</style>
