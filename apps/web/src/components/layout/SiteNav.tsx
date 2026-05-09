"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc";

export function SiteNav() {
  const pathname = usePathname();
  const { data: me } = trpc.search.me.useQuery(undefined, { retry: false });
  const isOwner = me?.role === "owner" || me?.role === "admin";

  function navLink(href: string, label: string) {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        className={`text-[11px] tracking-widest uppercase transition-colors duration-300 pb-0.5 border-b ${
          active
            ? "text-gold border-gold/60"
            : "text-stone/50 border-transparent hover:text-gold hover:border-gold/30"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="border-b border-gold/10 bg-black/98 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3 group">
          <span className="font-display text-lg tracking-[0.25em] text-gold uppercase font-light group-hover:text-gold-light transition-colors duration-300">
            ATTIKO
          </span>
          <span className="text-stone/30 text-[10px] tracking-widest hidden sm:inline uppercase">
            Talent Search
          </span>
        </Link>

        <nav className="flex items-center gap-8">
          <SignedIn>
            {navLink("/search", "Search")}
            {navLink("/shortlists", "Shortlists")}
            {isOwner && (
              <Link
                href="/console-x7k2m9"
                className={`text-[11px] tracking-widest uppercase transition-colors duration-300 pb-0.5 border-b ${
                  pathname.startsWith("/console")
                    ? "text-gold/80 border-gold/40"
                    : "text-gold/30 border-transparent hover:text-gold/70 hover:border-gold/20"
                }`}
              >
                Console
              </Link>
            )}
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-7 h-7",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in" className="text-[11px] tracking-widest uppercase text-stone/50 hover:text-gold transition-colors duration-300">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-[11px] tracking-widest uppercase bg-gold text-black px-5 py-2 hover:bg-gold-light transition-colors duration-300 font-medium"
            >
              Get started
            </Link>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
