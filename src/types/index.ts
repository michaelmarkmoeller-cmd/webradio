export type Category = "70's" | "80's" | "90's" | 'Pop' | 'Rock' | 'Dansk' | 'Italo' | 'Jul' | 'Dance'

export const CATEGORIES: Category[] = ["70's", "80's", "90's", 'Pop', 'Rock', 'Dansk', 'Italo', 'Jul', 'Dance']

export interface Station {
  id: string
  name: string
  streamUrl: string
  category: Category
  bitrate?: number
  logoUrl?: string
  country?: string
  createdAt?: Date
}

export interface StationFormData {
  name: string
  streamUrl: string
  category: Category
  bitrate?: number
  logoUrl?: string
  country?: string
}
