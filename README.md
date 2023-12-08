<img src="media/header.svg" width="800" align="center" alt="Okotoki"/>

# Okotoki API client for NodeJS

Okotoki is a WebSockets (and a bit of REST) API that provides access to normalized and computable data feeds from top cryptocurrency exchanges, including Binance, Coinbase, and BitMEX.

# Installation

```sh
npm i okotoki
```

# API keys

For a demo you can use `DEMO_API_KEY` and `DEMO_API_SECRET`. When you'll go for real - please contact us at [hey@okotoki.com](mailto:hey@okotoki.com).

# Usage

```js
import OkotokiAPI, { Exchanges, InMessage } from 'okotoki'

const API_KEY = 'DEMO_API_KEY'
const API_SECRET = 'DEMO_API_SECRET'

const api = new OkotokiAPI({
  key,
  secret,
  debug: true
})

api.onMessage = (msg: InMessage) => {
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

api.orderbook(
  [
    [Exchanges.bitmex, 'XBT_USDT'],
    [Exchanges.bitmex, 'XBTUSD']
  ],
  {
    step: 10,
    rate: 200
  }
)
```

That's it? That's it. See [./examples/basic-usage](examples/basic-usage) for more examples.

# What's included

## Supported spot and derivatives exchanges:

- Binance,
- Bitfinex,
- Bitmex,
- Bitstamp,
- Bybit,
- Coinbase,
- Deribit,
- Huobi,
- Kraken,
- Okex;

## Normalized data feeds

- trades & liquidations
- price
- orderbooks (_only Binance for now_)

## Computable data feeds

Computable is Okotoki's abstraction for a market data computation engine that combines realtime and historical data.

Currently available computable feeds:

- index (composit weighed asset price)
- rolling volume histograms (1h, 4h, 24h)
- large trades (trades feed filtered by size)
- large liquidations (liquidation feed filtered by size)
- grouped orderbooks (_only Binance for now_)

### What is a computable stream?

- computable manages it's memory for in-memory buffer, evicts in-memory data when needed
- computable understands historical data and can combine realtime and historical data into a single stream

### Key assumptions

- for now, we focus on a pretty recent data spanning up to a few days
- market data we collect is not too large
  - which mean we can store quite a lot of it in memory
  - and if needed when dumping to disk we can use pretty simple index structures updated infrequently to fetch fast enough
- we are fine with a few seconds to load older historical data

### Key design decisions

- we use simple and efficient fully-managed storage solutions: s3 for large chunks of data, dynamodb for small metadata
- we offload historical data indexing and fetching to lambda functions that allow to scale up with the load and parallelize single requests
- computables can load historical data and synchronize realtime data with other nodes

# API

The `Api` class is used to interact with the Okotoki API.

Okotoki Api uses [avro](https://avro.apache.org) for data serialization. This means that response messages are mostly in a binary format and have to be serialized for consumption. You'll have to take that into account if you'll want to call Okotoki API directly.

Currently, we do not provide responses in JSON.

## Constructor

```typescript
constructor(
  private options: OkotokiAPIOptions,
  private wsOptions?: WsOptions
)
```

### `OkotokiApiOptions`:

- `key: string` – API key
- `secret: string` – API secret
- `restUrl?: string` – custom URL for the REST API
- `wsUrl?: string` – custom URL for the WebSocket API
- `debug?: boolean` – enables debugging mode, with verbose logs

### `WsOptions` (optional)

Usually you won't need this and default WebSocket configuration will work just fine.

- `connectionTimeout: number` - maximum wait time (in milliseconds) for a connection to succeed before closing and retrying
- `WebSocket: WebSocket` - allows for a custom WebSocket implementation to be used
- `debug: boolean` - enables debugging mode, with verbose logs
- `maxReconnectionDelay: number` - represents the maximum wait time (in milliseconds) between reconnection attempts
- `minReconnectionDelay: number` - represents the minimum wait time (in milliseconds) between reconnection attempts
- `maxRetries: number` - represents the maximum number of reconnection attempts to make

## .subscribe

```typescript
public subscribe(subscriptions: Subscription[]): void
```

An generic method used to configure subscription feeds. Each `Subscription` corresponds to one of the available data feeds:

- [`OrderBook`](#orderbook)
- [`Trade`](#trade)
- [`Price`](#price)
- [`Index`](#index)
- [`TradeVolume`](#tradevolume)

Example:

```javascript
api.subscribe([
  { kind: 'index', coin: 'BTC' },
  { kind: 'index', coin: 'ETH' },
  { symbol: 'XBTUSDT', exchange: Exchanges.bitmex, kind: 'price' }
])
```

## .onMessage

```typescript
public onMessage(msg: InMessage): void
```

A message handler for all messages received from Okotoki API. All messages, received in binary format, will be serialized to JSON.

Possible incoming messages include:

- [`TradeNormalized`](#tradenormalized) - trade or liquidation update
- [`IndexNormalized`](#indexnormalized) - index price update
- [`PriceUpdateNormalized`](#priceupdatenormalized) - market price update
- [`TradeVolumeNormalized`](#tradevolumenormalized) - trade volume update
- [`BookChangeNormalized`](#bookchangenormalized) - order book update

and

- `ErrorMessage`

Example:

```javascript
api.onMessage = (message) => console.log(message)
```

### ErrorMessage

Fields:

- `type=error`
- `errorCode` (`string`) – camel-case string with a human and programmatically-readable error code
- `errorMessage` (`string) – message with error details
- _extra fields_ – for certain error codes additional fields with error details may be passed

Error codes:

- `unsupportedMessageType` – sent in case server received an unsupported message type from client. Currently `/ws`
  endpoint supports only non-streamed text messages.
- `parseError`
  - extra field `messageString` (`string`) – original in-message that we could not parse
- `readError` – error reading message json into an internal object representation due to schema validation error
  - extra field `validationErrors` (`array`) – schema validation errors details
  - extra field `message` (`any`) – original message json
- `streamMissing` – sent in case there was no stream found for a given [subscription](#subscription) in [subscribe](#in-typesubscribe) request
  - extra field `subscription` (`object`) – original [subscription](#subscription) for which subscribe failed

Example:

```json
{
  "type": "error",
  "errorCode": "streamMissing",
  "errorMessage": "Can't subscribe to subscription kind=KindLargeTrade for ExchangeSymbol(Coinbase,BTC-USD123) – no such stream.",
  "subscription": {
    "kind": "largeTrades",
    "exchange": "coinbase",
    "symbol": "BTC-USD123",
    "thresholdTrades": 0,
    "limitTrades": 30,
    "thresholdLiquidations": 0,
    "limitLiquidations": 30
  }
}
```

## Trade

Subscribe to trades and liquidations feed. Feed is configured to be filtered by size (in USD). On subscription you'll receive a batch of recent trades that satisfy threshold filtering.

Will emit `TradeNormalized` into `.onMessage` handler.

### TradeSubscription

- `kind: largeTrades` – subscription kind
- `symbol: string` - symbol for which to receive updates.
- `exchange: Exchange` - exchange for which to receive updates.
- `thresholdTrades: number` - minimum size of trades to receive updates for.
- `limitTrades: number` - maximum number of trades updates to receive.
- `thresholdLiquidations?: number` - Optional. minimum size of liquidations to receive updates for.
- `limitLiquidations?: number` - Optional. maximum number of liquidation updates to receive.

Example:

```javascript
api.subscribe([
  {
    kind: 'largeTrades',
    exchange: 'coinbase',
    symbol: 'BTC-USD',
    thresholdTrades: 50000,
    limitTrades: 30
  },
  {
    kind: 'largeTrades',
    exchange: Exchange.bitmex,
    symbol: 'XBTUSD',
    thresholdTrades: 200000,
    limitTrades: 30,
    thresholdLiquidations: 5000,
    limitLiquidations: 30
  }
])

// or via shortcut method

api.tradeAndLiquidation(
  [
    [Exchanges.bitmex, 'XBT_USDT'],
    [Exchanges.bitmex, 'XBTUSD']
  ],
  {
    thresholdTrades: 200000,
    thresholdLiquidations: 5000,
    limitLiquidations: 30,
    limitTrades: 30
  }
)
```

### TradeNormalized

Fields:

- `type=streamElem`
- `kind=trade/liquidation`
- `exchange` (`string`)
- `symbol` (`string`)
- `id` (`string`)
- `timestamp` (`string`)
- `price` (`number`)
- `amount` (`number`)
- `amountInQuoteUnits` (`number`)
- `side` (`string`) – `buy`/`sell`
- `isLiquidation` (`boolean`)

Example:

```json
{
  "type": "com.okotoki.model.Trade",
  "kind": "trade",
  "exchange": "coinbase",
  "symbol": "BTC-USD",
  "id": "tr:Coinbase:BTC-USD:n-354542039",
  "timestamp": "2022-06-13T14:48:00.743417Z",
  "price": 22900,
  "amount": 0.05,
  "amountInQuoteUnits": 1145,
  "side": "buy",
  "isLiquidation": false
}
```

## Price

Subscribe to market price data feed.

Will emit `PriceUpdateNormalized` into `.onMessage` handler.

### PriceSubscription

- `kind: price` – subscription kind
- `symbol: string` - symbol for which to receive updates.
- `exchange: Exchange` - exchange for which to receive updates.

Example:

```javascript
api.subscribe([
  { symbol: 'XBTUSDT', exchange: Exchanges.bitmex, kind: 'price' }
])

// or via shortcut method

api.price([
  [Exchanges.bitmex, 'XBT_USDT'],
  [Exchanges.bitmex, 'XBTUSD']
])
```

### PriceUpdateNormalized

Fields:

- `type=streamElem`
- `kind=price`
- `exchange` (`string`)
- `symbol` (`string`)
- `timestamp` (`string`)
- `price` (`number`)

Example:

```json
{
  "type": "com.okotoki.model.Price",
  "kind": "price",
  "exchange": "coinbase",
  "symbol": "BTC-USD",
  "timestamp": "2022-12-24T02:22:32.720792Z",
  "price": 16826.76
}
```

## Index

Subscribe to weighted price data feed. Okotoki provides weighted indexes for supported coins and fiat currencies. We use it internally to aggregate cross-asset data feeds. For exampl
-, indexes allow normalization of `BTC-EUR` market orderbook/trades in `USD`.

- `kind: index` – subscription kind
- `coin: string` - coin (`BTC`, `ETH`, etc) or fiat currency (`AUD`, `GBP`) symbol

Will emit `IndexNormalized` into `.onMessage` handler.

### IndexSubscription

Example:

```javascript
api.subscribe([
  { coin: 'BTC', kind: 'index' },
  { coin: 'ETH', kind: 'index' }
])

// or via shortcut method

api.index(['BTC', 'ETH'])
```

### IndexNormalized

Fields:

- `type=streamElem`
- `kind=index`
- `coin` (`string`)
- `price` (`number`)

Example:

```json
{
  "type": "com.okotoki.model.Index",
  "kind": "index",
  "coin": "BTC",
  "price": 22900
}
```

## OrderBook

Subscribe to order book data feed. Order book is grouped by `step` and updates are received every `rate` milliseconds.

- `kind: orderBook` - subscription kind
- `symbol: string` - symbol for which to receive updates.
- `exchange: Exchange` - exchange for which to receive updates.
- `step: number` - the step size for the order book updates.
- `rate: number` - the rate (in milliseconds) at which to receive order book updates.

Will emit `BookChangeNormalized` into `.onMessage` handler.

### OrderBookSubscription

Example:

```javascript
api.subscribe([
  {
    kind: 'orderBook',
    exchange: Exchange.binance,
    symbol: 'BTCUSDT',
    step: 10,
    rate: 3000
  }
])

// or via shortcut method

api.orderBook([[Exchange.binance, 'BTCUSDT']], {
  step: 10,
  rate: 3000
})
```

### BookChangeNormalized

Order book updates. First message received is always a snapshot (`isSnapshot=true`), with subsequent messages being what changed compared to snapshot.

Fields:

- `type=streamElem`
- `kind=price`
- `exchange` (`string`)
- `symbol` (`string`)
- `isSnapshot` (`boolean`) - tell you if received orderbook update is a snapshot or not
- `bids` (array of `BookPriceLevel`)
- `bids[].price` (`number`) – price of orderbook entry
- `bids[].amount` (`number`) - amount at orderbook entry
- `asks` (array of `BookPriceLevel`)
- `asks[].price` (`number`) – price of orderbook entry
- `asks[].amount` (`number`) - amount at orderbook entry

Example:

```json
{
  "type": "streamElem",
  "kind": "bookChange",
  "exchange": "coinbase",
  "symbol": "BTC-USD",
  "isSnapshot": true,
  "bids": [
    { "price": 30720, "amount": 0.01627 },
    { "price": 40960, "amount": 0.31364 },
    { "price": 32770, "amount": 0.76425 },
    { "price": 43010, "amount": 1.42729 },
    { "price": 34820, "amount": 0.0004 },
    { "price": 36870, "amount": 0.23131 },
    ...
    { "price": 38920, "amount": 1.13323 },
    { "price": 30730, "amount": 0.00175 },
    { "price": 40970, "amount": 0.03618 },
    { "price": 32780, "amount": 0.0258 }
  ],
  "asks": [
    { "price": 51200, "amount": 0.64225 },
    { "price": 53250, "amount": 0.02834 },
    { "price": 45060, "amount": 0.03268 },
    { "price": 55300, "amount": 0.0032 },
    { "price": 47110, "amount": 5.52742 },
    ...
    { "price": 49160, "amount": 0.10401 },
    { "price": 51210, "amount": 0.01091 },
    { "price": 53260, "amount": 0.03405 },
    { "price": 45070, "amount": 0.49237 },
    { "price": 55310, "amount": 0.00015 }
  ]
}
```

## TradeVolume

Subscribe to trade volume data feed. Rolling trade volume for 1h, 4h and 24h respectively.

- `kind: tradeVolume` - subscription kind
- `symbol: string` - symbol for which to receive updates.
- `exchange: Exchange` - exchange for which to receive updates.

Will emit `TradeVolumeNormalized` into `.onMessage` handler.

### TradeVolumeSubscription

Example:

```javascript
api.subscribe([
  {
    symbol: 'XBTUSD',
    exchange: Exchanges.bitmex,
    kind: 'tradeVolume'
  }
])

// or via shortcut method

api.tradeVolume([[Exchange.binance, 'BTCUSDT']])
```

### TradeVolumeNormalized

Fields:

- `type=streamElem`
- `kind=price`
- `exchange` (`string`)
- `symbol` (`string`)
- `volumes` (array of `TradeVolumeHistogram`)
- `volumes[].interval` (`number`) – `1 minute`/`5 minutes`/`1 hour` in millis
- `volumes[].window` (`number`) – `1 hour`/`4 hours`/`1 day` in millis
- `volumes[].earliestTimestamp` (`string`)
- `volumes[].latestTimestamp` (`string`)
- `volumes[].latestIntervalTimestamp` (`string`)
- `volumes[].volumesBuy` (`number[]`) – contains the number of intervals in the window plus
  one (for current incomplete interval) elements. The last element of the array corresponds
  to the latest interval.
- `volumes[].volumesSell` (`number[]`) – similar to `volumesSell` (see above)

Example:

```json
{
  "type": "streamElem",
  "kind": "tradeVolume",
  "exchange": "coinbase",
  "symbol": "BTC-USD",
  "volumes": [
    {
      "interval": 60000,
      "window": 3600000,
      "earliestTimestamp": "2022-12-24T02:22:01Z",
      "latestTimestamp": "2022-12-24T02:22:20Z",
      "latestIntervalTimestamp": "2022-12-24T02:22:00Z",
      "volumesBuy": [
        ...,
        0.19400856000000002
      ],
      "volumesSell": [
        ...,
        0.71882308
      ]
    },
    {
      "interval": 300000,
      "window": 14400000,
      "earliestTimestamp": "2022-12-24T02:22:01Z",
      "latestTimestamp": "2022-12-24T02:22:20Z",
      "latestIntervalTimestamp": "2022-12-24T02:20:00Z",
      "volumesBuy": [
        ...,
        22.740445899999997
      ],
      "volumesSell": [
        ...,
        68.29315792999996
      ]
    },
    {
      "interval": 3600000,
      "window": 86400000,
      "earliestTimestamp": "2022-12-24T02:22:01Z",
      "latestTimestamp": "2022-12-24T02:22:20Z",
      "latestIntervalTimestamp": "2022-12-24T02:00:00Z",
      "volumesBuy": [
        ...,
        94.97304128999991
      ],
      "volumesSell": [
        ...,
        184.75704159
      ]
    }
  ]
}
```

# License

MIT
