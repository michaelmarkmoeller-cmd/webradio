export type Category = "70's" | "80's" | "90's" | 'Pop' | 'Rock' | 'Dansk' | 'Italo' | 'Jul'

export const CATEGORIES: Category[] = ["70's", "80's", "90's", 'Pop', 'Rock', 'Dansk', 'Italo', 'Jul']

export interface Station {
  id: string
  name: string
  streamUrl: string
  category: Category
  bitrate?: number
  logoUrl?: string
  createdAt?: Date
}

export interface StationFormData {
  name: string
  streamUrl: string
  category: Category
  bitrate?: number
  logoUrl?: string
}
