import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, 'Password is required')
})

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username is too long'),
  email: z.email(),
  password: z.string().min(1, 'Password is required')
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

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password is required')
      .max(50, 'Password is too long'),
    confirmPassword: z
      .string()
      .min(8, 'Confirm password is required')
      .max(50, 'Confirm password is too long')
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Confirm password does not match'
  })

export const requestPasswordEmailSchema = z.object({
  email: z.email()
})
