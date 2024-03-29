import Api, { Exchanges } from '../src'

const key = 'YOUR_API_KEY'
const secret = 'YOUR_API_SECRET'

const api = new Api({
  key,
  secret,
  wsUrl: 'wss://api-eu.stage.okotoki.com/ws',
  debug: true
})

api.onMessage = (msg) => {
  console.log(msg)
}

api.subscribe([
  { kind: 'index', coin: 'BTC' },
  { kind: 'index', coin: 'ETH' },
  { symbol: 'BTCUSDT', exchange: Exchanges.binance, kind: 'price' },
  {
    symbol: 'BTCUSDT',
    exchange: Exchanges.binance,
    kind: 'largeTrades',
    thresholdTrades: 10000,
    limitTrades: 30,
    thresholdLiquidations: 0,
    limitLiquidations: 30
  },
  {
    symbol: 'XBTUSD',
    exchange: Exchanges.bitmex,
    kind: 'tradeVolume'
  }
])

api.tradeAndLiquidation(
  [
    [Exchanges.bitmex, 'XBT_USDT'],
    [Exchanges.bitmex, 'XBTUSD']
  ],
  {
    thresholdTrades: 50000,
    thresholdLiquidations: 0,
    limitLiquidations: 30,
    limitTrades: 30
  }
)

api.index(['BTC', 'ETH', 'BNB', 'AAVE', 'ATOM', 'EOS', 'LINK', 'UNI'])

api.orderBook([[Exchanges.binance, 'BTCUSDT']], {
  step: 10,
  rate: 1000,
  interval: 60000,
  window: 0
})

api.leveledTradeVolume([[Exchanges.binance, 'BTCUSDT']], {
  interval: 60000,
  window: 3600000,
  step: 10
})
