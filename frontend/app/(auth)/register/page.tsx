'use client'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/schema'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ACCESS_TOKEN_COOKIE_NAME, setCookie } from '@/lib/cookies'
import { getGoogleConnectUrl } from '@/lib/auth'
import { toast } from 'sonner'

export default function Page() {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(registerSchema)
  })

  const registerMutation = useMutation({
    mutationFn: (data: z.infer<typeof registerSchema>) =>
      api('/auth/local/register', {
        method: 'POST',
        body: data
      }),
    onSuccess: data => {
      setCookie(ACCESS_TOKEN_COOKIE_NAME, data.jwt)

      toast.success(
        'Registered successfully. Please check you email to verify and login again.'
      )

      router.push('/login')
    }
  })

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to Notee</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Username</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login">Login</Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              loading={registerMutation.isPending}
              type="submit"
              className="w-full"
            >
              Register
            </Button>
            <Button type="button" className="w-full" variant="outline">
              <Link href={getGoogleConnectUrl()}>Sign up with Google</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
