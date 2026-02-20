'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ACCESS_TOKEN_COOKIE_NAME, setCookie } from '@/lib/cookies'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

/**
 * Strapi redirects here after Google OAuth with jwt (or error) in the URL.
 * We store the token and send the user to /admin, or to /login on error.
 */
export default function GoogleRedirectPage() {
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: () => {
      const url = new URL(window.location.href)
      const searchParams = url.searchParams.toString()
      return api<{ jwt: string }>(`/auth/google/callback?${searchParams}`)
    },
    onSuccess: data => {
      setCookie(ACCESS_TOKEN_COOKIE_NAME, data.jwt)
      toast.success('Signed in with Google.')
      router.push('/admin')
    },
    onError: error => {
      toast.error('Failed to sign in with Google.')
      router.push('/login')
    }
  })

  useEffect(() => {
    mutation.mutate()
  }, [])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-muted-foreground">Completing sign-in…</p>
    </div>
  )
}
