import { Button } from './ui/button'
import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  text: string
}

export default function CopyButton({ text, ...props }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, 2000)
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} {...props}>
      {isCopied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}
