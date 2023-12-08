import Api, { Exchanges } from '../src'

const key = 'YOUR_API_KEY'
const secret = 'YOUR_API_SECRET'

const api = new Api({
  key,
  secret,
  debug: true
})

api.onMessage = (msg) => {
  console.log(msg)
}

api.subscribe([
  { kind: 'index', coin: 'BTC' },
  { kind: 'index', coin: 'ETH' },
  { symbol: 'XBTUSDT', exchange: Exchanges.bitmex, kind: 'price' },
  {
    symbol: 'XBT_USDT',
    exchange: Exchanges.bitmex,
    kind: 'largeTrades',
    thresholdTrades: 50000,
    limitTrades: 30,
    thresholdLiquidations: 0,
    limitLiquidations: 30
  },
  {
    symbol: 'XBTUSD',
    exchange: Exchanges.bitmex,
    kind: 'tradeVolume'
  },
  {
    kind: 'orderBook',
    exchange: Exchanges.binanceD,
    symbol: 'BTCBUSD',
    step: 10,
    rate: 200
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
  rate: 200
})
