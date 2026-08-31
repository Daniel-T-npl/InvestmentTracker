export interface PlaidItemRecord {
  item_id: string
  institution_id: string | null
  institution_name: string | null
  created_at: string
  updated_at: string
}

export interface Account {
  account_id: string
  item_id?: string
  institution_name?: string
  name: string
  mask?: string
  type: string
  subtype: string
  balances: {
    current: number | null
    available: number | null
    iso_currency_code: string | null
  }
}

export interface Holding {
  account_id: string
  security_id: string
  institution_price: number
  institution_value: number
  cost_basis: number | null
  quantity: number
}

export interface Security {
  security_id: string
  name: string | null
  ticker_symbol: string | null
  type: string | null
  close_price: number | null
}

export interface InvestmentTransaction {
  investment_transaction_id: string
  account_id: string
  security_id: string | null
  date: string
  name: string
  quantity: number
  amount: number
  price: number
  type: string
  subtype: string
}

export interface ProcessedHolding {
  holding: Holding
  security?: Security
  securityId: string
  ticker: string
  name: string
  type: string
  shares: number
  price: number
  currentValue: number
  costBasis: number | null
  costPerShare: number | null
  gainLossAmount: number | null
  gainLossPercent: number | null
  portfolioShare: number
  status: 'gain' | 'loss' | 'neutral' | 'unknown'
}

export interface ChartDataPoint {
  date: string
  displayDate: string
  value: number
  costBasis?: number
  gainLoss?: number
  gainLossPercent?: number
  ticker?: string
  [key: string]: any
}
