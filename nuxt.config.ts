export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/btcCoin/',
    head: {
      title: 'APEX — 合約盤面分析',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Binance 合約即時技術分析儀表板' },
        { name: 'theme-color', content: '#080c14' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;600;700&display=swap' }
      ]
    }
  },
  nitro: {
    preset: 'github-pages'
  },
  css: ['~/assets/main.css']
})
