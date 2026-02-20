'use client'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema } from '@/lib/schema'
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, Link } from 'lucide-react'
import { useState } from 'react'

export default function Page() {
  const router = useRouter()
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema as any)
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof resetPasswordSchema>) => {
      const code = new URLSearchParams(window.location.search).get('code')

      return await api(`/auth/reset-password`, {
        method: 'POST',
        skipAuthRedirect: true,
        body: {
          code: code,
          password: data.password,
          passwordConfirmation: data.confirmPassword
        }
      })
    },
    onSuccess: () => {
      toast.success('Password reset successfully, please login again!')

      router.push('/login')
    }
  })

  const onSubmit = (data: z.infer<typeof resetPasswordSchema>) => {
    resetPasswordMutation.mutate(data)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon">
            <Link href="/request-password-email">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <CardTitle>Reset Password</CardTitle>
        </div>
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form className="contents" onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Password</FormLabel>
                  <FormControl>
                    <InputGroup className="h-9 rounded-md">
                      <InputGroupInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        {...field}
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Confirm Password</FormLabel>
                  <FormControl>
                    <InputGroup className="h-9 rounded-md">
                      <InputGroupInput
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        {...field}
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              loading={resetPasswordMutation.isPending}
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
