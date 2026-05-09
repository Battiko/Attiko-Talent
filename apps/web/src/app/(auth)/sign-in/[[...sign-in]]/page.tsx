import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl tracking-widest text-gold uppercase mb-1">
            ATTIKO
          </h1>
          <p className="text-stone text-sm tracking-wide">— Talent Search</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-gold/20 rounded-none bg-charcoal",
              headerTitle: "font-display text-gold",
              headerSubtitle: "text-stone",
              socialButtonsBlockButton: "border-gold/20 text-gold hover:bg-charcoal-mid",
              formFieldLabel: "text-stone",
              formFieldInput: "bg-charcoal-mid border-gold/20 text-gold placeholder-stone/40",
              formButtonPrimary: "bg-gold hover:bg-gold-light text-black font-medium tracking-widest uppercase text-xs",
              footerActionLink: "text-gold hover:text-gold-light",
              identityPreviewText: "text-gold",
              identityPreviewEditButton: "text-stone hover:text-gold",
            },
          }}
        />
      </div>
    </div>
  );
}
