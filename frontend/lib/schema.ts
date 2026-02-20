import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email(),
  password: z.string()
})

export const registerSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z.string()
})

export const chatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long')
})

export const profileSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long')
})
