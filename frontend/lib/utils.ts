import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  const words = name.split(' ')

  if (words.length === 1) {
    return words[0].charAt(0)
  }

  return words[0].charAt(0) + words[words.length - 1].charAt(0)
}
