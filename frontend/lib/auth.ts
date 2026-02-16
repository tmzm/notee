/**
 * URL on the Strapi host that starts the Google OAuth flow.
 * User is redirected here; Strapi then redirects to Google and back to our frontend callback.
 */
export function getGoogleConnectUrl(): string {
  const base = process.env.baseApiUrl ?? ''
  const suffix = process.env.baseApiSuffix ?? '/api'
  const path = suffix.replace(/\/$/, '') + '/connect/google'
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`
}
