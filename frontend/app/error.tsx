'use client'

import Link from 'next/link'

export default function Error() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <span className="text-[5rem] font-bold text-foreground select-none">
        505
      </span>
      <h1 className="text-3xl font-semibold text-foreground mb-2">
        Something Went Wrong
      </h1>
      <p className="text-lg text-muted-foreground mb-6">
        Sorry, something went wrong, please try again later.
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
