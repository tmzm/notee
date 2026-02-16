import axios, { AxiosRequestConfig } from 'axios'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  getCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setCookie
} from './cookies'
import { redirect } from 'next/navigation'
import { isServer } from '@tanstack/react-query'
import { toast } from 'sonner'

type APIOptions = AxiosRequestConfig & {
  showToaster?: boolean
  params?: Record<string, unknown>
  body?: any
  skipAuthRedirect?: boolean
  onRefreshToken?: (data: { jwt: string }) => void
  _retry?: boolean
}

export function getApiBaseUrl(): string {
  return `${process.env.baseApiUrl ?? ''}${process.env.baseApiSuffix ?? ''}`
}

const axiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json'
  }
})

const redirectToLogin = () => {
  if (isServer) {
    redirect('/login?invS')
  }
  window.location.href = '/login?invS'
}

export async function api<T = any>(
  url: string,
  options: APIOptions = {}
): Promise<T> {
  const accessToken = await getCookie(ACCESS_TOKEN_COOKIE_NAME)
  const refreshToken = await getCookie(REFRESH_TOKEN_COOKIE_NAME)

  try {
    const res = await axiosInstance.request({
      ...options,
      url,
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : '',
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...options.headers
      },
      params: options.params,
      data: options.body
    })

    return res.data as T
  } catch (err: any) {
    const status = err?.response?.status

    if (
      status === 401 ||
      (status == 403 && !options.skipAuthRedirect && !options._retry)
    ) {
      if (!refreshToken) redirectToLogin()

      try {
        const refreshRes = await axiosInstance.post<{
          jwt: string
        }>('/auth/refresh', {
          refreshToken
        })

        if (!isServer) {
          setCookie(ACCESS_TOKEN_COOKIE_NAME, refreshRes.data.jwt)
        }

        options.onRefreshToken?.({
          jwt: refreshRes.data.jwt
        })

        return api<T>(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${refreshRes.data.jwt}`
          },
          _retry: true
        })
      } catch (refreshErr: any) {
        console.log('refreshErr', refreshErr)

        if (
          refreshErr?.response?.status === 401 ||
          refreshErr?.response?.status === 403
        ) {
          redirectToLogin()
        }
        throw refreshErr
      }
    }

    if (!isServer && options.showToaster !== false) {
      const message = err?.response?.data?.error?.message
        ? String(err?.response?.data?.error?.message)
        : 'An error occurred. Please try again later.'

      toast.error(message)
    }

    throw err
  }
}
