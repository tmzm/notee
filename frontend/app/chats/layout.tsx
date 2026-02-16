import DashboardLayout from '@/components/dashboard-layout'
import { CookiesProvider } from '@/components/provider'
import { api } from '@/lib/api'
import { getQueryClient } from '@/lib/get-query-client'
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'

export default async function Layout({
  children
}: {
  children: React.ReactNode
}) {
  const queryClient = getQueryClient()

  let newAccessToken = null

  await queryClient.fetchQuery({
    queryKey: ['user'],
    queryFn: () =>
      api('/users/me', {
        onRefreshToken: ({ jwt }) => {
          newAccessToken = jwt
        }
      })
  })

  const dehydrated = dehydrate(queryClient)

  return (
    <HydrationBoundary state={dehydrated}>
      <CookiesProvider accessToken={newAccessToken}>
        <DashboardLayout>{children}</DashboardLayout>
      </CookiesProvider>
    </HydrationBoundary>
  )
}
