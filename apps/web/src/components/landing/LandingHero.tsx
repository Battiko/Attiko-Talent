import Link from "next/link";

export function LandingHero() {
  return (
    <div className="min-h-screen bg-deep-forest flex flex-col">
      <header className="px-6 sm:px-12 pt-8 flex items-baseline gap-3">
        <span className="font-display text-2xl tracking-widest text-bone uppercase">
          ATTIKO
        </span>
        <span className="text-stone text-xs tracking-wide">— Talent Search</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-24">
        <p className="text-gold text-xs tracking-[0.3em] uppercase mb-8">
          International Talent Discovery
        </p>
        <h1 className="font-display text-5xl sm:text-7xl text-bone leading-tight mb-6 max-w-3xl text-balance">
          Find the perfect performer for any occasion
        </h1>
        <p className="text-stone text-lg max-w-xl mb-12 leading-relaxed">
          Search musicians, vocalists, DJs, and dancers from across the world.
          Built for wedding planners, event producers, and private clients.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/sign-up"
            className="bg-bone text-deep-forest px-8 py-3.5 rounded text-sm tracking-wide hover:bg-linen transition-colors"
          >
            Start searching free
          </Link>
          <Link
            href="/sign-in"
            className="border border-stone text-stone px-8 py-3.5 rounded text-sm tracking-wide hover:border-bone hover:text-bone transition-colors"
          >
            Sign in
          </Link>
        </div>
        <p className="text-stone/60 text-xs mt-6">
          14-day Pro trial · No credit card required
        </p>
      </main>

      <footer className="px-6 sm:px-12 pb-8 text-center">
        <p className="text-stone/40 text-xs">
          © {new Date().getFullYear()} Attiko. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
