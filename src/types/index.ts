export type Category = "80's" | "90's" | 'Pop' | 'Rock' | 'Dansk' | 'Italo'

export const CATEGORIES: Category[] = ["80's", "90's", 'Pop', 'Rock', 'Dansk', 'Italo']

export interface Station {
  id: string
  name: string
  streamUrl: string
  category: Category
  createdAt?: Date
}

export interface StationFormData {
  name: string
  streamUrl: string
  category: Category
}
