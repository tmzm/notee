'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileUp } from 'lucide-react'

const MAX_PDFS_PER_CHAT = 3
const PDF_ACCEPT = '.pdf,application/pdf'

type UploadSourceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: number
  currentSourceCount?: number
  maxSources?: number
}

export function UploadSourceDialog({
  open,
  onOpenChange,
  chatId,
  currentSourceCount = 0,
  maxSources = MAX_PDFS_PER_CHAT
}: UploadSourceDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const slotsLeft = Math.max(0, maxSources - currentSourceCount)
  const atLimit = currentSourceCount >= maxSources

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const pdfs = Array.from(files).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    const toAdd = pdfs.slice(0, slotsLeft - selectedFiles.length)
    setSelectedFiles(prev => [...prev, ...toAdd].slice(0, slotsLeft))
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFiles.length === 0 || atLimit) return
    const totalAfter = currentSourceCount + selectedFiles.length
    if (totalAfter > maxSources) {
      toast.error(`Maximum ${maxSources} PDFs per chat allowed.`)
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      selectedFiles.forEach((file) => form.append('files', file))
      await api(`/chats/${chatId}/sources`, {
        method: 'POST',
        body: form
      })
      queryClient.invalidateQueries({ queryKey: ['chats', chatId] })
      toast.success('Files uploaded.')
      setSelectedFiles([])
      fileInputRef.current?.value && (fileInputRef.current.value = '')
      onOpenChange(false)
    } finally {
      setUploading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedFiles([])
      fileInputRef.current?.value && (fileInputRef.current.value = '')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Upload sources</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Only {maxSources} PDFs per chat allowed due to free limits.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={PDF_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={atLimit}
            >
              <FileUp className="size-4" />
              Choose PDFs {atLimit ? `(max ${maxSources})` : `(${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} left)`}
            </Button>
            {selectedFiles.length > 0 && (
              <ul className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={uploading}
              disabled={selectedFiles.length === 0 || atLimit}
            >
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
