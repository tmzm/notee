'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
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
import { chatSchema } from '@/lib/schema'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Chat } from '@/types'
import { api } from '@/lib/api'

type ChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  chat?: Chat | null
  onSuccess?: (chat?: { id: number } | null) => void
}

export function ChatDialog({
  open,
  onOpenChange,
  mode,
  chat,
  onSuccess
}: ChatDialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<z.infer<typeof chatSchema>>({
    resolver: zodResolver(chatSchema as any),
    defaultValues: { title: '' }
  })

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof chatSchema>) =>
      api('/chats', { method: 'POST', body: { data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    }
  })
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number
      data: z.infer<typeof chatSchema>
    }) => api(`/chats/${id}`, { method: 'PUT', body: { data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    }
  })

  const isEdit = mode === 'edit'
  const mutation = isEdit ? updateMutation : createMutation

  useEffect(() => {
    if (open) {
      if (isEdit && chat) {
        form.reset({ title: chat.title })
      } else {
        form.reset({ title: '' })
      }
    }
  }, [open, isEdit, chat, form])

  const onSubmit = (data: z.infer<typeof chatSchema>) => {
    if (isEdit && chat) {
      updateMutation.mutate(
        { id: chat.id, data },
        {
          onSuccess: () => {
            toast.success('Chat updated')
            onOpenChange(false)
            onSuccess?.()
          }
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: newChat => {
          toast.success('Chat created')
          onOpenChange(false)
          form.reset({ title: '' })
          onSuccess?.(newChat ?? undefined)
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit chat' : 'New chat'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id="chat-dialog-form"
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="required">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Chat title" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="chat-dialog-form"
                loading={mutation.isPending}
              >
                {isEdit ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
