'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ChatDialog } from '@/components/chat-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { Chat } from '@/types'

export default function ChatsPage() {
  const queryClient = useQueryClient()
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Chat | null>(null)

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api<Chat[]>('/chats')
  })

  const deleteChatMutation = useMutation({
    mutationFn: (chatId: number) =>
      api(`/chats/${chatId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setDeleteConfirm(null)
      toast.success('Chat deleted.')
    }
  })

  const hasReachedChatLimit = !isLoading && chats.length >= 1
  const canAddChat = !isLoading && chats.length < 1

  const openCreateDialog = () => {
    if (canAddChat) {
      setSelectedChat(null)
      setDialogOpen(true)
    }
  }

  const openEditDialog = (chat: Chat) => {
    setSelectedChat(chat)
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setSelectedChat(null)
  }

  return (
    <div className="space-y-8">
      {/* Welcome card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Your chats and notes are here. Start a new conversation or pick up
            where you left off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={openCreateDialog}
            disabled={isLoading || hasReachedChatLimit}
          >
            <Plus className="size-4" />
            New chat
          </Button>
          {hasReachedChatLimit && (
            <p className="text-xs text-muted-foreground">
              Only one chat allowed due to free limits.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chats grid with pagination */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent chats</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-[120px] animate-pulse" />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <Card className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <MessageSquare className="size-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No chats yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={openCreateDialog}
              disabled={isLoading || hasReachedChatLimit}
            >
              New chat
            </Button>
            {hasReachedChatLimit && (
              <p className="mt-2 text-xs text-muted-foreground">
                Only one chat allowed due to free limits.
              </p>
            )}
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {chats.map(chat => (
                <Card
                  key={chat.id}
                  className="h-full transition-colors hover:bg-muted/50"
                >
                  <CardContent className="flex h-full flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/chats/${chat.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="rounded-lg bg-primary/10 p-2">
                          <MessageSquare className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {chat.title || 'Untitled'}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2 text-xs">
                            Open this chat
                          </CardDescription>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0"
                            onClick={e => e.preventDefault()}
                            aria-label="Chat options"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={e => {
                              e.preventDefault()
                              openEditDialog(chat)
                            }}
                          >
                            <Pencil className="size-4" />
                            Edit chat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={e => {
                              e.preventDefault()
                              setDeleteConfirm(chat)
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* New chat card - hidden when at limit */}
              {!hasReachedChatLimit && (
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="text-left"
                  disabled={isLoading}
                >
                  <Card className="flex h-full py-2 items-center justify-center border-dashed transition-colors hover:bg-muted/50 hover:border-primary/30">
                    <CardContent className="flex flex-col items-center gap-2 py-6">
                      <Plus className="size-8 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        New chat
                      </span>
                    </CardContent>
                  </Card>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <ChatDialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!open) {
            handleDialogClose()
          }
        }}
        mode={selectedChat ? 'edit' : 'create'}
        chat={selectedChat}
        onSuccess={handleDialogClose}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={open => !open && setDeleteConfirm(null)}
        title="Delete chat"
        description={
          deleteConfirm
            ? `Delete "${deleteConfirm.title || 'Untitled'}"? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteChatMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) deleteChatMutation.mutate(deleteConfirm.id)
        }}
      />
    </div>
  )
}
