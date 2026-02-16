import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME
} from '@/lib/cookies'
import { cookies } from 'next/headers'

export async function proxy(request: NextRequest) {
  const url = new URL(request.url)

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  // If you found that the url has invS parameter, it means that cookies is invalid => remove cookies and redirect to the login page
  // If the user is not trying to access the login page and does not have an access token, redirect to the login page
  if (
    (url.pathname === '/login' && url.searchParams.has('invS')) ||
    (url.pathname !== '/login' && !accessToken)
  ) {
    const cookieStore = await cookies()
    cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME)
    cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME)
  }

  // Continue normally
  return NextResponse.next()
}
