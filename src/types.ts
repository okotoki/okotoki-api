const EXCHANGES = [
  'binance',
  'binance-Ⓓ',
  'binance-Ⓕ',
  'bitfinex',
  'bitfinex-Ⓓ',
  'bitmex',
  'bitstamp',
  'bybit',
  'bybit-Ⓓ',
  'bybit-Ⓢ',
  'coinbase',
  'deribit',
  'huobi',
  'huobi-Ⓕ',
  'huobi-Ⓓ',
  'huobi-Ⓢ',
  'kraken',
  'okex',
  'okex-Ⓕ',
  'okex-Ⓓ'
] as const

export enum Exchanges {
  'binance' = 'binance',
  'binanceD' = 'binance-Ⓓ',
  'binanceF' = 'binance-Ⓕ',
  'bitfinex' = 'bitfinex',
  'bitfinexD' = 'bitfinex-Ⓓ',
  'bitmex' = 'bitmex',
  'bitstamp' = 'bitstamp',
  'bybit' = 'bybit',
  'bybitD' = 'bybit-Ⓓ',
  'bybitS' = 'bybit-Ⓢ',
  'coinbase' = 'coinbase',
  'deribit' = 'deribit',
  'huobi' = 'huobi',
  'huobiF' = 'huobi-Ⓕ',
  'huobiD' = 'huobi-Ⓓ',
  'huobiS' = 'huobi-Ⓢ',
  'kraken' = 'kraken',
  'okex' = 'okex',
  'okexF' = 'okex-Ⓕ',
  'okexD' = 'okex-Ⓓ'
}

export type Exchange = (typeof EXCHANGES)[number]

export interface SubscriptionConfig {
  type: 'subscribe'
  subscriptions: Subscription[]
}

export type Subscription =
  | TradeSubscription
  | PriceSubscription
  | TradeVolumeSubscription
  | OrderBookSubscription
  | IndexSubscription
  | LeveledTradeVolumeSubscription
  | CandlesSubscription

export interface BaseSubscription {
  symbol: string
  exchange: Exchange
}

export interface TradeSubscriptionOptions {
  thresholdTrades: number
  limitTrades: number
  thresholdLiquidations?: number
  limitLiquidations?: number
}

export interface LeveledTradeVolumeSubscriptionOptions {
  interval: number
  window: number
  step: number
}

export interface TradeSubscription
  extends BaseSubscription,
    TradeSubscriptionOptions {
  kind: 'largeTrades'
}

export interface PriceSubscription extends BaseSubscription {
  kind: 'price'
}

export interface LeveledTradeVolumeSubscription
  extends BaseSubscription,
    LeveledTradeVolumeSubscriptionOptions {
  kind: 'leveledTradeVolume'
}

export interface TradeVolumeSubscription extends BaseSubscription {
  kind: 'tradeVolume'
}

export interface OrderBookSubscriptionOptions {
  step: number
  rate: number
  interval: number
  window: number
}

export interface OrderBookSubscription
  extends BaseSubscription,
    OrderBookSubscriptionOptions {
  kind: 'orderBook'
}

export interface IndexSubscription {
  kind: 'index'
  coin: string
}

export interface CandlesSubscriptionOptions {
  interval: number
  window: number
  metrics: string[]
}

export interface CandlesSubscription
  extends BaseSubscription,
    CandlesSubscriptionOptions {
  kind: 'candles'
}

export type MarketState = 'enabled' | 'disabled' | 'unlisted'

export type StateEvent = {
  state: MarketState
  timestamp: string
}

export type Market = {
  exchange: Exchange
  symbol: string
  marketType: string
  base: string
  baseNormalized: string
  quote: string
  quoteNormalized: string
  state: MarketState
  updatedTimestamp: string
  isFree: boolean
  stateHistory: StateEvent[]
}

export interface Pong {
  type: 'pong'
}

export interface TradeNormalized {
  type: BinaryMessageType.Trade
  kind: 'trade' | 'liquidation'
  exchange: Exchange
  symbol: string
  id: string
  timestamp: string
  price: number
  amount: number
  amountInQuoteUnits: number
  side: 'buy' | 'sell' | 'unknown'
  isLiquidation: boolean
}

export interface PriceUpdateNormalized {
  type: BinaryMessageType.Price
  exchange: Exchange
  symbol: string
  timestamp: string
  price: number
}

export type VolumeHistogram = {
  interval: number
  window: number
  earliestTimestamp: number
  latestTimestamp: number
  latestIntervalTimestamp: Date
  volumesBuy: number[]
  volumesSell: number[]
}

export type PriceLevel = {
  readonly price: number
  readonly amount: number
}

export interface TradeVolumeNormalized {
  type: BinaryMessageType.TradeVolume
  exchange: Exchange
  symbol: string
  volumes: VolumeHistogram[]
}

export interface IndexNormalized {
  type: BinaryMessageType.Index
  coin: string
  price: number
}

export interface BookChangeNormalized {
  type: BinaryMessageType.BookChange
  exchange: Exchange
  symbol: string
  timestamp: number
  idx: number
  isSnapshot: boolean
  bids: PriceLevel[]
  asks: PriceLevel[]
}

export type LeveledTradeVolumeNormalized = {
  type: BinaryMessageType.LeveledTradeVolume
  exchange: string
  symbol: string
  timestamp: number
  interval: number
  idx: number
  isSnapshot: boolean
  levelsBuy: PriceLevel[]
  levelsSell: PriceLevel[]
}

export interface ErrorMessage {
  type: 'error'
  errorCode: string
  errorMessage: string
}

export interface Subscribed {
  type: 'subscribed'
  subscriptions: Subscription[]
}

export interface Ping {
  type: 'ping'
}

export interface Auth {
  type: 'auth'
  key: string
  secret: string
}

export interface BinarySchema {
  type: 'binarySchema'
  schema: any
}

export type InJSONMessage = ErrorMessage | Subscribed | Pong | BinarySchema

export enum BinaryMessageType {
  Trade = 'com.okotoki.model.Trade',
  Index = 'com.okotoki.model.Index',
  Price = 'com.okotoki.model.Price',
  TradeVolume = 'com.okotoki.model.TradeVolume',
  BookChange = 'com.okotoki.model.BookChange',
  LeveledTradeVolume = 'com.okotoki.model.LeveledTradeVolume'
}

export type InBinaryMessageRaw =
  | {
      [BinaryMessageType.Trade]?: Omit<TradeNormalized, 'type'>
    }
  | {
      [BinaryMessageType.Index]?: Omit<IndexNormalized, 'type'>
    }
  | {
      [BinaryMessageType.Price]?: Omit<PriceUpdateNormalized, 'type'>
    }
  | {
      [BinaryMessageType.TradeVolume]?: Omit<TradeVolumeNormalized, 'type'>
    }
  | {
      [BinaryMessageType.BookChange]?: Omit<BookChangeNormalized, 'type'>
    }
  | {
      [BinaryMessageType.LeveledTradeVolume]?: Omit<
        LeveledTradeVolumeNormalized,
        'type'
      >
    }

export type InBinaryMessage =
  | TradeNormalized
  | IndexNormalized
  | PriceUpdateNormalized
  | TradeVolumeNormalized
  | BookChangeNormalized
  | LeveledTradeVolumeNormalized

export type InMessage = InJSONMessage | InBinaryMessage

export type OutMessage = SubscriptionConfig | Ping | Auth
