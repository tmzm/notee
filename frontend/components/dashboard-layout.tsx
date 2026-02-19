'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/get-query-client'
import { User } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback } from './ui/avatar'
import { getInitials } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Monitor, Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  removeCookie
} from '@/lib/cookies'
import Link from 'next/link'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const queryClient = getQueryClient()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const userData = queryClient.getQueryData<User>(['user'])

  const { theme, setTheme } = useTheme()

  const logoutMutation = useMutation({
    mutationFn: () =>
      api('/auth/logout', { method: 'POST', showToaster: false }),
    onSuccess: () => {
      removeCookie(ACCESS_TOKEN_COOKIE_NAME)
      removeCookie(REFRESH_TOKEN_COOKIE_NAME)
      router.push('/login')
    }
  })

  const handleLogoutConfirm = () => {
    logoutMutation.mutate()
  }

  return (
    <div className="bg-background">
      <header className="h-14 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="font-semibold tracking-tight">Notee</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar>
                <AvatarFallback>
                  {getInitials(userData?.username ?? '')}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Avatar>
                  <AvatarFallback>
                    {getInitials(userData?.username ?? '')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{userData?.username}</div>
                  <div className="text-sm text-muted-foreground">
                    {userData?.email}
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ToggleGroup
                value={theme}
                onValueChange={setTheme}
                type="single"
                className="w-full"
              >
                <ToggleGroupItem
                  value="light"
                  aria-label="Toggle light"
                  className="grow"
                >
                  <Sun />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dark"
                  aria-label="Toggle dark"
                  className="grow"
                >
                  <Moon />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="system"
                  aria-label="Toggle system"
                  className="grow"
                >
                  <Monitor />
                </ToggleGroupItem>
              </ToggleGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault()
                  setLogoutConfirmOpen(true)
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="h-[calc(100vh-8rem)] p-4">{children}</main>
      <footer className="sticky bottom-0 z-50 bg-background h-14 border-t border-border/40 py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          Notee — your AI personal agent for notes and ideas by{' '}
          <Link
            href="https://tareq-mozayek-portfolio.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Tareq Al-Mozayek
          </Link>{' '}
          &copy; {new Date().getFullYear()}
        </div>
      </footer>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Log out"
        description="Are you sure you want to log out?"
        confirmLabel="Log out"
        variant="default"
        loading={logoutMutation.isPending}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  )
}
