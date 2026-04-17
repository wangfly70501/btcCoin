# ⬡ APEX — 合約盤面分析

Binance 永續合約即時技術分析儀表板，基於 Nuxt3 靜態部署。

## 功能

- 🔴 即時價格（WebSocket）
- 📊 多時間週期分析：15分 / 1H / 4H / 8H / 12H / 日線
- 📈 真實技術指標：RSI · MACD · 布林帶 · EMA 20/50/200
- 🎯 進場訊號：做多 / 做空 / 觀望（訊號反轉立即通知）
- 💰 槓桿風控計算器（1x～125x）
- 🔍 666+ 幣種選擇
- 📱 手機響應式

## 本地開發

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 建立 GitHub repo（名稱：`apex-futures`）
2. 把所有檔案 push 到 main branch
3. 進入 repo Settings → Pages → Source 選 **GitHub Actions**
4. Push 後自動部署，網址：`https://你的帳號.github.io/apex-futures/`

> ⚠️ 如果 repo 名稱不是 `apex-futures`，請修改 `nuxt.config.ts` 裡的 `baseURL`

## 技術棧

- Nuxt 3 (SSR disabled, static generate)
- Vue 3 Composition API
- TypeScript
- Binance Futures API + WebSocket
- 純 SVG 圖表（無外部圖表庫）
