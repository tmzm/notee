'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronLeft,
  Download,
  FileUp,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Trash2
} from 'lucide-react'
import { api, getApiBaseUrl } from '@/lib/api'
import { ACCESS_TOKEN_COOKIE_NAME, getCookie } from '@/lib/cookies'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadSourceDialog } from '@/components/upload-source-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { Chat, Media } from '@/types'
import Markdown from 'react-markdown'
import CopyButton from '@/components/copy-button'
import remarkGfm from 'remark-gfm'

async function streamChatMessage({
  url,
  token,
  content,
  onEvent
}: {
  url: string
  token?: string
  content: string
  onEvent: (event: { content?: string; done?: boolean; error?: string }) => void
}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ content }),
    cache: 'no-store'
  })

  if (!res.ok || !res.body) {
    throw new Error('Streaming request failed')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      if (!chunk.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(chunk.slice(6))
        // If the server sends {"error": "..."} as a message, treat as error event
        if (parsed && typeof parsed === 'object' && parsed.error) {
          onEvent({ error: parsed.error })
        } else {
          onEvent(parsed)
        }
      } catch (err) {
        // If parsing fails, optionally ignore or handle error
        // You may also choose to call onEvent({ error: "Malformed chunk" }) here
      }
    }
  }
}

export default function SingleChatPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [messageInput, setMessageInput] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteSourceConfirm, setDeleteSourceConfirm] = useState<{
    sourceId: number
    name: string
  } | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const {
    data: chat,
    isLoading: chatLoading,
    error
  } = useQuery({
    queryKey: ['chats', id],
    queryFn: () => api<Chat>(`/chats/${id}`)
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chats', id, 'messages'],
    queryFn: async () => {
      const res = await api<{ data?: { role: string; content: string }[] }>(
        `/chats/${id}/messages`
      )
      return Array.isArray(res?.data) ? res.data : []
    },
    enabled: !!id
  })

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messagesData])

  const messages = messagesData ?? []

  const removeSourceMutation = useMutation({
    mutationFn: (sourceId: number) =>
      api(`/chats/${id}/sources/${sourceId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats', id] })
      setDeleteSourceConfirm(null)
      toast.success('Source removed.')
    }
  })

  const sources = (chat?.sources ?? []) as Media[]

  // --- Streaming mutation using useMutation ---
  const streamMutation = useMutation({
    mutationFn: async (content: string) => {
      const token = await getCookie?.(ACCESS_TOKEN_COOKIE_NAME)
      const url = `${getApiBaseUrl()}/chats/${id}/messages/stream`

      return new Promise<void>((resolve, reject) => {
        streamChatMessage({
          url,
          token,
          content,
          onEvent: async event => {
            if (event.error) {
              toast.error(event.error)
              reject(new Error(event.error))
              return
            }
            if (event.content) {
              setStreamingContent(prev => prev + event.content)
            }
            if (event.done) {
              await queryClient.invalidateQueries({
                queryKey: ['chats', id, 'messages']
              })

              messagesContainerRef.current?.scrollIntoView({
                behavior: 'smooth'
              })

              resolve()
            }
          }
        }).catch(err => {
          reject(err)
        })
      })
    },
    onMutate: async () => {
      setStreamingContent('')
      setMessageInput('')
    },
    onSettled: () => {
      setStreamingContent('')
    }
  })

  const handleSend = useCallback(() => {
    if (!messageInput.trim() || streamMutation.isPending) return
    streamMutation.mutate(messageInput.trim())
  }, [messageInput, streamMutation])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-muted-foreground">Error loading chat.</p>
        <Button asChild variant="outline">
          <Link href="/admin">Back to chats</Link>
        </Button>
      </div>
    )
  }

  return (
    <SidebarProvider className="min-h-auto!">
      <Sidebar className="pt-14 pb-18">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Sources</SidebarGroupLabel>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setUploadDialogOpen(true)}
              disabled={sources.length >= 3}
            >
              <FileUp className="size-4" />
              Upload PDFs
            </Button>
            <p className="mt-2 px-2 text-xs text-muted-foreground">
              Only 3 PDFs per chat allowed due to free limits.
            </p>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Uploaded</SidebarGroupLabel>
            {chatLoading ? (
              <SidebarMenu>
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
                <SidebarMenuSkeleton />
              </SidebarMenu>
            ) : sources.length > 0 ? (
              <SidebarMenu>
                {sources.map(s => (
                  <SidebarMenuItem
                    key={s.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {s.name ?? s.url ?? `File ${s.id}`}
                    </span>
                    <Button variant="ghost" size="icon-xs">
                      <Link href={s.url || ''} target="_blank">
                        <Download className="size-3" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      size="icon-xs"
                      aria-label="Remove source"
                      onClick={() =>
                        setDeleteSourceConfirm({
                          sourceId: s.id!,
                          name: s.name ?? s.url ?? `File ${s.id}`
                        })
                      }
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="ps-3 text-xs text-muted-foreground">
                No files uploaded yet.
              </p>
            )}
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="h-[calc(100vh-10rem)] border rounded-xl overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
          <SidebarTrigger />
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/admin" aria-label="Back to chats">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
            {chatLoading ? (
              <Skeleton className="w-24 h-4" />
            ) : (
              (chat?.title ?? 'Chat')
            )}
          </h1>
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <span className="text-sm">Loading messages…</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
              <MessageSquare className="size-12 opacity-30" />
              <p className="text-sm">No messages yet. Ask a question below.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((msg, i) => (
                <li
                  key={`s-${i}`}
                  className={cn(
                    'flex flex-col gap-2',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {msg.role == 'user' ? (
                      msg.content
                    ) : msg.content ? (
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </Markdown>
                    ) : (
                      <span className="text-muted-foreground italic">
                        No response from Notee.
                      </span>
                    )}
                  </div>
                  <CopyButton size="icon-xs" text={msg.content} />
                </li>
              ))}
              {streamMutation.isPending && (
                <>
                  <li className="flex justify-end">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
                      {streamMutation.variables}
                      <Loader2
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden
                      />
                    </div>
                  </li>
                  <li className="flex justify-start">
                    {streamingContent ? (
                      <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                        <Markdown>{streamingContent}</Markdown>
                      </div>
                    ) : (
                      <Skeleton className="w-5 h-5 rounded-full" />
                    )}
                  </li>
                </>
              )}
            </ul>
          )}
        </div>

        <div className="flex gap-2 shrink-0 border-t border-border bg-background p-3">
          <Textarea
            placeholder="Ask Notee…"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            rows={4}
          />
          <Button
            type="submit"
            size="icon-lg"
            className="shrink-0 self-end"
            onClick={handleSend}
            disabled={!messageInput.trim()}
            loading={streamMutation.isPending}
          >
            <Send className="size-4" aria-label="Send" />
          </Button>
        </div>
      </SidebarInset>

      <UploadSourceDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        chatId={Number(id)}
        currentSourceCount={sources.length}
        maxSources={3}
      />

      <ConfirmDialog
        open={!!deleteSourceConfirm}
        onOpenChange={open => !open && setDeleteSourceConfirm(null)}
        title="Remove source"
        description={
          deleteSourceConfirm
            ? `Remove "${deleteSourceConfirm.name}" from this chat? The file will be deleted.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        loading={removeSourceMutation.isPending}
        onConfirm={() => {
          if (deleteSourceConfirm)
            removeSourceMutation.mutate(deleteSourceConfirm.sourceId)
        }}
      />
    </SidebarProvider>
  )
}
