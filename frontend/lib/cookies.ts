import Cookies from 'js-cookie'

export const ACCESS_TOKEN_COOKIE_NAME = 'notee.access-token'
export const REFRESH_TOKEN_COOKIE_NAME = 'notee.refresh-token'

export function getCookie(name: string) {
  if (typeof window === 'undefined') {
    // Server side
    return (async () => {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      return cookieStore.get(name)?.value
    })()
  }

  // Client side
  return Cookies.get(name)
}

export function setCookie(name: string, value: string) {
  Cookies.set(name, value, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
}

export function removeCookie(name: string) {
  Cookies.remove(name)
}
