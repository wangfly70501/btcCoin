<template>
  <div class="tf-bar">
    <button
      v-for="tf in TIMEFRAMES"
      :key="tf.value"
      class="tf-btn"
      :class="{ active: modelValue === tf.value }"
      @click="emit('update:modelValue', tf.value)"
    >
      {{ tf.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { TIMEFRAMES } from '~/types'
import type { Timeframe } from '~/types'

defineProps<{ modelValue: Timeframe }>()
const emit = defineEmits<{ 'update:modelValue': [Timeframe] }>()
</script>

<style scoped>
.tf-bar {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tf-btn {
  background: rgba(255,255,255,.04);
  border: 1px solid var(--border);
  color: var(--dim);
  font-family: var(--sans);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 1px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all .2s;
}
.tf-btn:hover { border-color: var(--accent); color: var(--accent); }
.tf-btn.active {
  background: rgba(0,212,255,.12);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 10px rgba(0,212,255,.2);
}
</style>
