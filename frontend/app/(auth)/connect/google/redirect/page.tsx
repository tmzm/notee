'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ACCESS_TOKEN_COOKIE_NAME, setCookie } from '@/lib/cookies'
import { toast } from 'sonner'

/**
 * Strapi redirects here after Google OAuth with jwt (or error) in the URL.
 * We store the token and send the user to /chats, or to /login on error.
 */
export default function GoogleRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const jwt = searchParams.get('jwt') ?? searchParams.get('access_token')
    const error = searchParams.get('error')

    if (error) {
      toast.error(error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed.')
      router.replace('/login')
      return
    }

    if (jwt) {
      setCookie(ACCESS_TOKEN_COOKIE_NAME, jwt)
      toast.success('Signed in with Google.')
      router.replace('/chats')
      return
    }

    toast.error('No token received from Google sign-in.')
    router.replace('/login')
  }, [router, searchParams])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-muted-foreground">Completing sign-in…</p>
    </div>
  )
}
