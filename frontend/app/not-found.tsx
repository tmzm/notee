'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <span className="text-[5rem] font-bold text-foreground select-none">
        404
      </span>
      <h1 className="text-3xl font-semibold text-foreground mb-2">
        Page Not Found
      </h1>
      <p className="text-lg text-muted-foreground mb-6">
        Sorry, we couldn't find the page you were looking for.
      </p>
      <Link
        href="/"
        className="inline-block rounded-md bg-primary px-6 py-2 text-background text-base font-medium transition-colors hover:bg-primary/80"
      >
        Go back home
      </Link>
    </div>
  )
}
