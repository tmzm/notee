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

type UploadSourceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: number
}

export function UploadSourceDialog({
  open,
  onOpenChange,
  chatId
}: UploadSourceDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files?.length) {
      setSelectedFiles(Array.from(files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFiles.length === 0) return
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="size-4" />
              Choose files
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
              disabled={selectedFiles.length === 0}
            >
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
