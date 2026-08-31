export type UserRole = 'BUYER' | 'SELLER' | 'MANAGER'
export type UserStatus = 'ACTIVE' | 'SUSPENDED'
export type AssetKind = 'LICENSE_ONLY' | 'ACTIVE_BUSINESS'
export type BusinessState = 'ACTIVE' | 'NOT_ACTIVE'
export type ListingState = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'REMOVED'

export type Profile = {
  id: string
  email: string
  full_name: string
  company: string | null
  role: UserRole
  status: UserStatus
  created_at: string
}

export type BuyerProfile = {
  user_id: string
  headline: string | null
  description: string | null
  sectors: string[]
  jurisdictions: string[]
  ticket_min_eur: number | null
  ticket_max_eur: number | null
  updated_at: string
}

export type Asset = {
  id: string
  public_id: number
  seller_id: string
  title: string
  description: string | null
  country: string
  sector: string
  license_type: string
  regulator: string | null
  asset_kind: AssetKind
  business_state: BusinessState
  year_of_issue: number | null
  employees: number | null
  /** Whole euro cents. Prices are never floats. */
  asking_price_cents: number
  included_activities: string[]
  status: ListingState
  validated: boolean
  views: number
  created_at: string
}

export type ContactRequest = {
  id: string
  from_user_id: string
  to_user_id: string
  asset_id: string | null
  message: string
  created_at: string
}

/** The five sectors N5Deal groups its listings by. */
export const SECTORS = ['Bank', 'Fintech', 'Payment', 'EMI', 'Crypto'] as const
