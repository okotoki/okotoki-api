import Api, {
  Exchanges,
  coinIndex,
  largeTrades,
  leveledTradeVolume,
  orderBook,
  price,
  tradeVolume
} from '../src'

const key = 'YOUR_API_KEY'
const secret = 'YOUR_API_SECRET'

const api = new Api({
  key,
  secret,
  wsUrl: 'wss://api-eu.stage.okotoki.com/ws',
  debug: true,
  useBinary: false
})

api.onMessage = (msg) => {
  console.log(msg)
}

api.subscribe([
  // { kind: 'index', coin: 'BTC' },
  // { kind: 'index', coin: 'ETH' },
  // { symbol: 'BTCUSDT', exchange: Exchanges.binance, kind: 'price' },
  // {
  // {
  //   symbol: 'BTCUSDT',
  //   exchange: Exchanges.binance,
  //   kind: 'largeTrades',
  //   thresholdTrades: 10000,
  //   limitTrades: 30,
  //   thresholdLiquidations: 0,
  //   limitLiquidations: 30
  // }
  // {
  //   symbol: 'XBTUSD',
  //   exchange: Exchanges.bitmex,
  //   kind: 'tradeVolume'
  // }
  {
    kind: 'candles',
    exchange: Exchanges.binance,
    symbol: 'BTCUSDT',
    interval: 60000,
    window: 3600000,
    metrics: ['open', 'low', 'high']
  }
])

// or using helper subscrition methods

const tradesOpts = {
  thresholdTrades: 50000,
  thresholdLiquidations: 0,
  limitLiquidations: 30,
  limitTrades: 30
}

const orderBookOpts = {
  step: 10,
  rate: 1000,
  interval: 60000,
  window: 0
}

const leveledTradeVolumeOpts = {
  interval: 60000,
  window: 3600000,
  step: 10
}

// api.subscribe([
//   coinIndex('BTC'),
//   coinIndex('ETH'),
//   price(Exchanges.binance, 'BTCUSDT'),
//   largeTrades(Exchanges.binance, 'BTCUSDT', tradesOpts),
//   largeTrades(Exchanges.bitmex, 'XBTUSD', tradesOpts),
//   tradeVolume(Exchanges.bitmex, 'BTCUSDT'),
//   orderBook(Exchanges.binance, 'BTCUSDT', orderBookOpts),
//   leveledTradeVolume(Exchanges.binance, 'BTCUSDT', leveledTradeVolumeOpts)
// ])
