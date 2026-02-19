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
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronLeft,
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
import type { Media } from '@/types'
import Markdown from 'react-markdown'

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
  const params = useParams()
  const queryClient = useQueryClient()
  const id = typeof params.id === 'string' ? parseInt(params.id, 10) : NaN
  const [messageInput, setMessageInput] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteSourceConfirm, setDeleteSourceConfirm] = useState<{
    sourceId: number
    name: string
  } | null>(null)
  const [streamingUser, setStreamingUser] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const { data: chat, isLoading: chatLoading } = useQuery({
    queryKey: ['chats', id],
    queryFn: () => api(`/chats/${id}`),
    enabled: Number.isInteger(id) && !Number.isNaN(id)
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['chats', id, 'messages'],
    queryFn: async () => {
      const res = await api<{ data?: { role: string; content: string }[] }>(
        `/chats/${id}/messages`
      )
      return Array.isArray(res?.data) ? res.data : []
    },
    enabled: Number.isInteger(id) && !Number.isNaN(id)
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

  const handleSend = useCallback(async () => {
    if (!messageInput.trim() || isStreaming) return

    const content = messageInput.trim()
    const token = await getCookie?.(ACCESS_TOKEN_COOKIE_NAME)
    const url = `${getApiBaseUrl()}/chats/${id}/messages/stream`

    setStreamingUser(content)
    setStreamingContent('')
    setMessageInput('')
    setIsStreaming(true)

    try {
      await streamChatMessage({
        url,
        token,
        content,
        onEvent: async event => {
          if (event.error) {
            toast.error(event.error)
            throw new Error(event.error)
          }
          if (event.content) {
            setStreamingContent(prev => prev + event.content)
          }
          if (event.done) {
            await queryClient.invalidateQueries({
              queryKey: ['chats', id, 'messages']
            })

            messagesContainerRef.current?.scrollIntoView({ behavior: 'smooth' })

            setStreamingUser(null)
            setStreamingContent('')
            setIsStreaming(false)
          }
        }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Streaming failed')

      setStreamingUser(null)
      setStreamingContent('')
      setIsStreaming(false)
    }
  }, [id, messageInput, isStreaming, queryClient])

  if (Number.isNaN(id)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-muted-foreground">Invalid chat.</p>
        <Button asChild variant="outline">
          <Link href="/chats">Back to chats</Link>
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
            {sources.length > 0 ? (
              <ul className="space-y-1">
                {sources.map(s => (
                  <li
                    key={s.id}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <Paperclip className="size-3 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {s.name ?? s.url ?? `File ${s.id}`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 opacity-0 group-hover:opacity-100"
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
                  </li>
                ))}
              </ul>
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
            <Link href="/chats" aria-label="Back to chats">
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
          ) : messages.length === 0 && !streamingUser ? (
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
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
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
                    ) : (
                      <Markdown>{msg.content}</Markdown>
                    )}
                  </div>
                </li>
              ))}
              {streamingUser != null && (
                <>
                  <li className="flex justify-end">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap">
                      {streamingUser}
                      <Loader2
                        className="size-4 shrink-0 animate-spin"
                        aria-hidden
                      />
                    </div>
                  </li>
                  <li className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                      {streamingContent ? (
                        <Markdown>{streamingContent}</Markdown>
                      ) : (
                        <span className="text-muted-foreground">…</span>
                      )}
                    </div>
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
            loading={isStreaming}
          >
            <Send className="size-4" aria-label="Send" />
          </Button>
        </div>
      </SidebarInset>

      <UploadSourceDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        chatId={id}
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
