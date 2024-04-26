import { Type } from 'avsc'
import dbg from 'debug'
import 'isomorphic-fetch'
import WebSocket from 'isomorphic-ws'
import ReconnectingWebSocket, { Event } from './reconnecting-websocket'
import {
  BinaryMessageType,
  Exchange,
  InBinaryMessage,
  InBinaryMessageRaw,
  IndexSubscription,
  InJSONMessage,
  InMessage,
  LeveledTradeVolumeSubscription,
  LeveledTradeVolumeSubscriptionOptions,
  Market,
  OrderBookSubscription,
  OrderBookSubscriptionOptions,
  OutMessage,
  PriceSubscription,
  Subscription,
  TradeSubscription,
  TradeSubscriptionOptions,
  TradeVolumeSubscription
} from './types'

export * from './types'

export type WsOptions = Partial<{
  // Maximum wait for a connection to succeed before closing and retrying
  connectionTimeout: number
  // custom WebSocket implementation
  WebSocket: WebSocket
  // enables debugging mode, with verbose logs
  debug: boolean
  // Maximum wait between reconnection attempts
  maxReconnectionDelay: number
  // Minimum wait between reconnection attempts
  minReconnectionDelay: number
  // Maximum number of reconnection attempts to make
  maxRetries: number
}>

export type OkotokiApiOptions = {
  // API key
  key: string
  // API secret
  secret: string
  // custom URL for WebSocket API
  wsUrl?: string
  // custom URL for Rest API
  restUrl?: string
  // enables debugging mode, with verbose logs
  debug?: boolean
  // Deserialize binary messages on client or on backend
  useBinary?: boolean
}

export const largeTrades = (
  exchange: Exchange,
  symbol: string,
  options: TradeSubscriptionOptions
): TradeSubscription => ({
  kind: 'largeTrades',
  exchange,
  symbol,
  ...options
})

export const orderBook = (
  exchange: Exchange,
  symbol: string,
  options: OrderBookSubscriptionOptions
): OrderBookSubscription => ({
  kind: 'orderBook',
  exchange,
  symbol,
  ...options
})

export const price = (
  exchange: Exchange,
  symbol: string
): PriceSubscription => ({
  kind: 'price',
  exchange,
  symbol
})

export const tradeVolume = (
  exchange: Exchange,
  symbol: string
): TradeVolumeSubscription => ({
  kind: 'tradeVolume',
  exchange,
  symbol
})

export const leveledTradeVolume = (
  exchange: Exchange,
  symbol: string,
  options: LeveledTradeVolumeSubscriptionOptions
): LeveledTradeVolumeSubscription => ({
  kind: 'leveledTradeVolume',
  exchange,
  symbol,
  ...options
})

export const coinIndex = (coin: string): IndexSubscription => ({
  kind: 'index',
  coin
})

const defaultOptions: OkotokiApiOptions = {
  key: '',
  secret: '',
  debug: false,
  useBinary: true
}

const defaultWsOptions: WsOptions = {
  connectionTimeout: 4000,
  WebSocket: WebSocket,
  debug: false,
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 4000,
  maxRetries: Infinity
}

export default class Api {
  private _rws?: ReconnectingWebSocket
  private _wsUrl: string = 'wss://api-eu.okotoki.com/ws'
  private _restUrl: string = 'https://api-eu.okotoki.com'
  private pingInterval: null | NodeJS.Timeout = null
  private binarySchema: Type | undefined
  private _initiallyConnected = false
  private debug = dbg('okotoki-api')

  public onMessage: (msg: InMessage) => void = () => {}

  constructor(
    private options: OkotokiApiOptions,
    private wsOptions?: WsOptions
  ) {
    this.options = { ...defaultOptions, ...options }
    this._wsUrl = this.options.wsUrl || this._wsUrl
    this._restUrl = this.options.restUrl || this._restUrl
    this.debug.enabled = !!this.options.debug
    this.wsOptions = wsOptions
      ? { ...defaultWsOptions, ...wsOptions }
      : defaultWsOptions

    this.connect()
  }

  public getSupportedCoins = (): Promise<string[]> =>
    fetch(`${this._restUrl}/coins`).then((res) => res.json())

  public getMarketsForCoin = (coin: string): Promise<Market[]> =>
    fetch(`${this._restUrl}/markets/${coin.toUpperCase()}`).then((res) =>
      res.json()
    )

  public subscribe(subscriptions: Subscription[]) {
    this._sendSubscriptionMessage(subscriptions)
  }

  public connect() {
    this.debug('estabilishing connection to %s', this._wsUrl)

    this._rws = new ReconnectingWebSocket(
      `${this._wsUrl}?useBinary=${
        this.options?.useBinary === undefined
          ? defaultOptions.useBinary
          : this.options.useBinary
      }`,
      undefined,
      this.wsOptions
    )

    this._rws.onopen = this._onConnectionEstabilished
    this._rws.onclose = this._onConnectionClosed
    this._rws.onmessage = this._onMessage
    this._rws.onerror = this._onError
  }

  public disconnect() {
    this.debug('disconnecting from to %s', this._wsUrl)
    this.stopPingInterval()
    this._rws!.close()
  }

  public reconnect() {
    this.debug('reconnecting to %s', this._wsUrl)
    this.stopPingInterval()
    this._rws!.reconnect()
  }

  _preConnectSubscriptionsQueue: Subscription[][] = []

  private _sendSubscriptionMessage(subscriptions: Subscription[]) {
    if (this._initiallyConnected) {
      this._send({
        type: 'subscribe',
        subscriptions: removeDuplicates(subscriptions)
      })
    } else {
      this._preConnectSubscriptionsQueue.push(subscriptions)
    }
  }

  private _rawBinaryToNormalized = (
    message: InBinaryMessageRaw
  ): InBinaryMessage => {
    // it is guaranteed that there is only one key
    const res = Object.entries(message).map(
      ([key, message]: [string, Omit<InBinaryMessage, 'type'>]) => {
        return {
          ...message,
          type: key as BinaryMessageType
        } as InBinaryMessage
      }
    )

    return res[0]
  }

  private _parseIncomingMessage = async (
    message: Buffer | Blob | string
  ): Promise<InMessage> => {
    if (message instanceof Blob) {
      const buf = await new Response(message).arrayBuffer()
      const fromBinary = this.binarySchema?.fromBuffer(
        Buffer.from(buf)
      ) as InBinaryMessageRaw

      return this._rawBinaryToNormalized(fromBinary)
    } else if (message instanceof Buffer) {
      const fromBinary = this.binarySchema?.fromBuffer(
        message
      ) as InBinaryMessageRaw
      return this._rawBinaryToNormalized(fromBinary)
    } else {
      return JSON.parse(message) as InJSONMessage
    }
  }

  private _onMessage = async (event: MessageEvent) => {
    this._updatePingInterval()

    const message = !this.options?.useBinary
      ? (() => {
          const data = JSON.parse(event.data)
          const type = Object.keys(data)[0]

          return { ...data[type], type }
        })()
      : await this._parseIncomingMessage(event.data)

    this.debug('received message %o', message)

    if (message.type === 'binarySchema') {
      this.binarySchema = Type.forSchema(message.schema)
      return
    }

    if (message.type === 'pong') return
    if (message.type === 'subscribed') return

    this.onMessage(message)
  }

  private _send = (message: OutMessage) => {
    this.debug('sending message %o', message)

    this._rws?.send(JSON.stringify(message))
  }

  private _updatePingInterval() {
    this.stopPingInterval()
    this.pingInterval = setInterval(this._ping, 60 * 1000)
  }

  private stopPingInterval() {
    if (!this.pingInterval) return

    clearInterval(this.pingInterval)
    this.pingInterval = null
  }

  private _ping = () => {
    this.debug('sending ping')
    this._send({
      type: 'ping'
    })
  }

  private _auth = () => {
    this.debug('sending authorization')
    this._send({
      type: 'auth',
      key: this.options.key,
      secret: this.options.secret
    })
  }

  private _onError = (error: Event) => {
    this.debug('connection error', error)
  }

  private _onConnectionEstabilished = async () => {
    this.debug('estabilished connection')
    this._updatePingInterval()

    this._initiallyConnected = true
    this._auth()

    this._sendSubscriptionMessage(this._preConnectSubscriptionsQueue.flat())
    this._preConnectSubscriptionsQueue = []
  }

  private _onConnectionClosed = () => {
    this.debug('connection closed')
    this.stopPingInterval()
    this._initiallyConnected = false
  }
}

const removeDuplicates = <T>(arr: T[]): T[] =>
  arr.filter((item, index) => arr.indexOf(item) === index)
