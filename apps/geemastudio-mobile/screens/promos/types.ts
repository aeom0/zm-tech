import type {
  PromoBroadcast,
  PromoBroadcastItem,
  PromoBroadcastStatus,
  PromoItemStatus,
  PromoRecipient,
} from '@geemastudio/data'

export type { PromoBroadcast, PromoBroadcastItem }
export type BroadcastStatus = PromoBroadcastStatus
export type ItemStatus = PromoItemStatus
export type ClienteSegmento = PromoRecipient

export type PromoStep = 'config' | 'clientes' | 'preview' | 'enviando' | 'resultado'
