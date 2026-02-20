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
import { requestPasswordEmailSchema } from '@/lib/schema'
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
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'

export default function Page() {
  const router = useRouter()
  const form = useForm<z.infer<typeof requestPasswordEmailSchema>>({
    resolver: zodResolver(requestPasswordEmailSchema as any)
  })

  const requestPasswordEmailMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestPasswordEmailSchema>) => {
      return await api(`/auth/forgot-password`, {
        method: 'POST',
        skipAuthRedirect: true,
        body: data
      })
    },
    onSuccess: () => {
      toast.success('You will receive a password reset email!')

      router.push('/reset-password')
    }
  })

  const onSubmit = (data: z.infer<typeof requestPasswordEmailSchema>) => {
    requestPasswordEmailMutation.mutate(data)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon">
            <Link href="/login">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <CardTitle>Reset Password</CardTitle>
        </div>
      </CardHeader>
      <Form {...form}>
        <form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
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
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              loading={requestPasswordEmailMutation.isPending}
              type="submit"
              className="w-full"
            >
              Reset Password
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
