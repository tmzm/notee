'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { profileSchema } from '@/lib/schema'
import { api } from '@/lib/api'
import type { User } from '@/types'
import { getQueryClient } from '@/lib/get-query-client'
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  removeCookie
} from '@/lib/cookies'
import { AlertTriangle } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const queryClient = getQueryClient()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const user = queryClient.getQueryData<User>(['user'])

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema as any),
    defaultValues: { username: '' }
  })

  const updateMutation = useMutation({
    mutationFn: (data: z.infer<typeof profileSchema>) =>
      api<User>(`/users/${user?.id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success('Profile updated')
    }
  })

  const deleteAccountMutation = useMutation({
    mutationFn: () =>
      api(`/users/${user?.id}`, { method: 'DELETE', showToaster: false }),
    onSuccess: () => {
      removeCookie(ACCESS_TOKEN_COOKIE_NAME)
      removeCookie(REFRESH_TOKEN_COOKIE_NAME)
      toast.success('Account deleted')
      router.push('/login')
    }
  })

  useEffect(() => {
    if (user) {
      form.reset({ username: user.username })
    }
  }, [user, form])

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateMutation.mutate(data)
  }

  if (!user) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Update your account information. Changes are saved to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              id="profile-form"
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="required">Username</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your username"
                        autoComplete="username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                form="profile-form"
                loading={updateMutation.isPending}
              >
                Update
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleteAccountMutation.isPending}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete account"
        description="Are you sure you want to delete your account? All your data will be permanently removed. This action cannot be undone."
        confirmLabel="Delete account"
        variant="destructive"
        loading={deleteAccountMutation.isPending}
        onConfirm={() => deleteAccountMutation.mutate()}
      />
    </div>
  )
}
