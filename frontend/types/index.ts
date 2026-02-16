export interface User {
  blocked?: boolean
  confirmed?: boolean
  createdAt?: string
  documentId: string
  email: string
  id: number
  provider?: string
  publishedAt?: string
  updatedAt?: string
  username: string
}

export interface Media {
  alternativeText?: string
  caption?: string
  createdAt?: string
  documentId?: string
  ext?: string
  focalPoint?: string
  folderPath?: string
  formats?: {
    large: {
      ext: string
      url: string
    }
  }
  hash?: string
  height?: number
  id?: number
  locale?: string
  mime?: string
  name?: string
  previewUrl?: string
  provider_metadata?: string
  publishedAt?: string
  size?: number
  updatedAt?: string
  url?: string
  width?: number
}

export interface Chat {
  id: number
  documentId?: string
  sources?: Media[]
  title: string
  user?: number | User
  createdAt?: string
  updatedAt?: string
}

/** Conversation message from Redis/LangChain (GET /chats/:id/messages) */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
