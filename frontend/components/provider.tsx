'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ACCESS_TOKEN_COOKIE_NAME, setCookie } from '@/lib/cookies'
import { getQueryClient } from '@/lib/get-query-client'
import { Toaster } from 'sonner'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { TooltipProvider } from './ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  )
}

export function CookiesProvider({
  accessToken,
  children
}: {
  accessToken: string | null
  children: React.ReactNode
}) {
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (accessToken) {
      setCookie(ACCESS_TOKEN_COOKIE_NAME, accessToken)
    }

    setSynced(true)
  }, [accessToken])

  if (!synced && accessToken) return null

  return children
}
