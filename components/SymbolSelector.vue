<template>
  <div class="symbol-selector">
    <!-- Current symbol display -->
    <button class="current-sym" @click="toggleOpen">
      <span class="sym-name">{{ modelValue.replace('USDT', '') }}</span>
      <span class="sym-usdt">/USDT</span>
      <span class="sym-arrow">{{ open ? '▲' : '▼' }}</span>
    </button>

    <!-- Teleport dropdown to body to avoid stacking context issues -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div v-if="open" class="sym-backdrop" @click="open = false" />

      <!-- Dropdown -->
      <div v-if="open" class="sym-dropdown" :style="dropdownStyle">
        <!-- Search -->
        <div class="sym-search-wrap">
          <input
            ref="searchInput"
            v-model="query"
            class="sym-search"
            placeholder="搜尋幣種..."
            @keydown.escape="open = false"
          />
          <span class="sym-search-icon">⌕</span>
        </div>

        <!-- Hot -->
        <div class="sym-section-label">熱門合約</div>
        <div class="sym-hot-grid">
          <button
            v-for="s in HOT_SYMBOLS"
            :key="s"
            class="sym-hot-btn"
            :class="{ active: modelValue === s }"
            @click="select(s)"
          >
            {{ s.replace('USDT', '') }}
          </button>
        </div>

        <!-- All results -->
        <div class="sym-section-label">
          {{ query ? `搜尋結果 (${filtered.length})` : `全部合約 (${allSymbols.length})` }}
        </div>
        <div class="sym-list">
          <div v-if="loadingSymbols" class="sym-loading">載入中...</div>
          <button
            v-for="s in filtered.slice(0, 100)"
            :key="s.symbol"
            class="sym-row"
            :class="{ active: modelValue === s.symbol }"
            @click="select(s.symbol)"
          >
            <span class="sym-row-base">{{ s.baseAsset }}</span>
            <span class="sym-row-quote">/USDT</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { HOT_SYMBOLS } from '~/types'
import type { SymbolInfo } from '~/types'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { fetchAllSymbols } = useBinance()

const open = ref(false)
const query = ref('')
const allSymbols = ref<SymbolInfo[]>([])
const loadingSymbols = ref(false)
const searchInput = ref<HTMLInputElement>()
const triggerRef = ref<HTMLElement>()
const dropdownStyle = ref({})

const filtered = computed(() => {
  if (!query.value) return allSymbols.value
  const q = query.value.toUpperCase()
  return allSymbols.value.filter(s => s.symbol.includes(q) || s.baseAsset.includes(q))
})

function calcPosition() {
  const btn = document.querySelector('.current-sym') as HTMLElement
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: rect.bottom + 6 + 'px',
    left: rect.left + 'px',
    width: '320px',
    zIndex: 99999,
  }
}

async function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    calcPosition()
    searchInput.value?.focus()
    if (allSymbols.value.length === 0) {
      loadingSymbols.value = true
      allSymbols.value = await fetchAllSymbols()
      loadingSymbols.value = false
    }
  }
}

function select(symbol: string) {
  emit('update:modelValue', symbol)
  open.value = false
  query.value = ''
}
</script>

<style>
/* Global styles for teleported elements */
.sym-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99998;
}
.sym-dropdown {
  background: #0d1421;
  border: 1px solid #1a2d4a;
  box-shadow: 0 8px 40px rgba(0,0,0,.8);
  display: flex;
  flex-direction: column;
  max-height: 500px;
  overflow: hidden;
}
</style>

<style scoped>
.symbol-selector { position: relative; }

.current-sym {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0,212,255,.1);
  border: 1px solid var(--accent);
  padding: 6px 14px;
  cursor: pointer;
  font-family: var(--sans);
}
.sym-name { font-size: 1.2rem; font-weight: 700; color: var(--accent); letter-spacing: 2px; }
.sym-usdt { font-size: 0.85rem; color: var(--dim); }
.sym-arrow { font-size: 0.75rem; color: var(--dim); margin-left: 4px; }

.sym-search-wrap {
  position: relative;
  padding: 10px;
  border-bottom: 1px solid #1a2d4a;
}
.sym-search {
  width: 100%;
  background: rgba(0,212,255,.05);
  border: 1px solid #1a2d4a;
  color: #d4e8ff;
  font-family: var(--sans);
  font-size: 1rem;
  padding: 7px 32px 7px 10px;
  outline: none;
}
.sym-search:focus { border-color: var(--accent); }
.sym-search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: #4a6080;
  font-size: 1.2rem;
}

.sym-section-label {
  font-size: 0.7rem;
  letter-spacing: 2px;
  color: #4a6080;
  text-transform: uppercase;
  padding: 8px 10px 4px;
}

.sym-hot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 10px 10px;
  border-bottom: 1px solid #1a2d4a;
}
.sym-hot-btn {
  background: rgba(255,255,255,.04);
  border: 1px solid #1a2d4a;
  color: #d4e8ff;
  font-family: var(--sans);
  font-size: 0.85rem;
  padding: 3px 10px;
  cursor: pointer;
  transition: all .2s;
}
.sym-hot-btn:hover, .sym-hot-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(0,212,255,.1);
}

.sym-list {
  overflow-y: auto;
  flex: 1;
}
.sym-loading { padding: 16px; color: #4a6080; font-size: 0.9rem; text-align: center; }
.sym-row {
  display: flex;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(26,45,74,.3);
  cursor: pointer;
  text-align: left;
  transition: background .15s;
}
.sym-row:hover, .sym-row.active { background: rgba(0,212,255,.07); }
.sym-row-base { font-size: 1rem; font-weight: 600; color: #d4e8ff; }
.sym-row-quote { font-size: 0.8rem; color: #4a6080; }
</style>

