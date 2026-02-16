import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export const registerSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string()
})

export const chatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long')
})
