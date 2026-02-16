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
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Trash2
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

const PAGE_SIZE = 9

export default function ChatsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Chat | null>(null)

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api('/chats')
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

  const total = Array.isArray(chats) ? chats.length : 0
  const start = (page - 1) * PAGE_SIZE
  const paginatedChats = Array.isArray(chats)
    ? chats.slice(start, start + PAGE_SIZE)
    : []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const openCreateDialog = () => setDialogOpen(true)

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
        <CardContent>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            New chat
          </Button>
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
        ) : paginatedChats.length === 0 ? (
          <Card className="flex min-h-[200px] flex-col items-center justify-center py-12">
            <MessageSquare className="size-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No chats yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={openCreateDialog}
            >
              New chat
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedChats.map(chat => (
                <Card
                  key={chat.id}
                  className="h-full transition-colors hover:bg-muted/50"
                >
                  <CardContent className="flex h-full flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/chats/${chat.id}`}
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
              {/* New chat card */}
              <button
                type="button"
                onClick={openCreateDialog}
                className="text-left"
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
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!hasPrev}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!hasNext}
                  onClick={() => setPage(p => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ChatDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
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
