import Link from "next/link";

export function LandingHero() {
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Subtle radial glow behind heading */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[800px] h-[500px] rounded-full bg-gold/[0.04] blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 sm:px-16 pt-10">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl tracking-[0.25em] text-gold uppercase font-light">
            ATTIKO
          </span>
          <span className="hidden sm:inline text-stone/40 text-[10px] tracking-widest uppercase">
            Talent Search
          </span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/sign-in" className="text-stone/60 hover:text-gold text-xs tracking-widest uppercase transition-colors duration-300">
            Sign in
          </Link>
          <Link href="/sign-up" className="text-black bg-gold hover:bg-gold-light text-xs tracking-widest uppercase px-6 py-2.5 transition-colors duration-300 font-medium">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-16 pt-8">
        <p className="text-gold/50 text-[10px] tracking-[0.4em] uppercase mb-10 font-sans">
          International Talent Discovery
        </p>

        <h1 className="font-display text-[clamp(3rem,8vw,7rem)] text-gold leading-[1.05] mb-8 max-w-4xl font-light text-balance">
          Find the perfect performer for any occasion
        </h1>

        <p className="text-stone/70 text-base sm:text-lg max-w-lg mb-14 leading-relaxed font-sans font-light">
          Discover world-class musicians, vocalists, DJs, and dancers.
          Built for talent agents and event producers.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/sign-up"
            className="w-full sm:w-auto bg-gold text-black text-xs tracking-[0.2em] uppercase px-10 py-4 hover:bg-gold-light transition-colors duration-300 font-medium"
          >
            Start searching free
          </Link>
          <Link
            href="/sign-in"
            className="w-full sm:w-auto border border-gold/20 text-gold/60 text-xs tracking-[0.2em] uppercase px-10 py-4 hover:border-gold/50 hover:text-gold transition-colors duration-300"
          >
            Sign in
          </Link>
        </div>

        <p className="text-stone/30 text-[11px] tracking-widest uppercase mt-8 font-sans">
          14-day Pro trial &nbsp;·&nbsp; No credit card required
        </p>
      </main>

      {/* Divider line */}
      <div className="relative z-10 w-px h-16 bg-gradient-to-b from-gold/20 to-transparent mx-auto mb-8" />

      {/* Footer */}
      <footer className="relative z-10 pb-10 text-center">
        <p className="text-stone/20 text-[10px] tracking-widest uppercase font-sans">
          © {new Date().getFullYear()} Attiko &nbsp;·&nbsp; All rights reserved
        </p>
      </footer>
    </div>
  );
}
