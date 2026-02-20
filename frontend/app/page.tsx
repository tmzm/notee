'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquare, Sparkles, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="text-xl">Notee</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Button asChild size="sm">
              <Link href="/admin">Try</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container px-4 py-20 md:py-28">
        <div className="mx-auto max-w-2xl space-y-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your AI personal agent
          </h1>
          <p className="text-lg text-muted-foreground md:text-xl">
            Notee helps you capture ideas, organize notes, and get things done
            with a single intelligent assistant that understands you.
          </p>
          <Button asChild size="lg">
            <Link href="/admin">Try Notee</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40 bg-muted/30">
        <div className="py-16 container">
          <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Why Notee?
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <MessageSquare className="mb-4 size-10 text-primary" />
              <h3 className="mb-2 font-semibold">Conversational</h3>
              <p className="text-sm text-muted-foreground">
                Chat naturally. Notee remembers context and helps you build on
                your thoughts across sessions.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Sparkles className="mb-4 size-10 text-primary" />
              <h3 className="mb-2 font-semibold">Smart & personal</h3>
              <p className="text-sm text-muted-foreground">
                Your notes and preferences shape how Notee responds—so you get
                answers that actually fit your workflow.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Zap className="mb-4 size-10 text-primary" />
              <h3 className="mb-2 font-semibold">Always ready</h3>
              <p className="text-sm text-muted-foreground">
                Capture ideas anytime. Notee organizes and surfaces them when
                you need them most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          Notee — your AI personal agent for notes and ideas by{' '}
          <Link
            href="https://tareq-mozayek-portfolio.netlify.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Tareq Al-Mozayek
          </Link>{' '}
          &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
