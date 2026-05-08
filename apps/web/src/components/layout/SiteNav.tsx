"use client";

import Link from "next/link";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function SiteNav() {
  return (
    <header className="border-b border-sand bg-off-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-widest text-deep-forest uppercase">
            ATTIKO
          </span>
          <span className="text-stone text-xs tracking-wide hidden sm:inline">
            — Talent Search
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          <SignedIn>
            <Link
              href="/search"
              className="text-sm text-bark hover:text-deep-forest transition-colors"
            >
              Search
            </Link>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-sm text-bark hover:text-deep-forest transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-deep-forest text-bone px-4 py-1.5 rounded hover:bg-forest transition-colors"
            >
              Get started
            </Link>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
