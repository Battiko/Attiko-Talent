import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-off-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl tracking-widest text-deep-forest uppercase mb-1">
            ATTIKO
          </h1>
          <p className="text-stone text-sm tracking-wide">— Talent Search</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-sand rounded-lg bg-linen",
              headerTitle: "font-display text-deep-forest",
              formButtonPrimary: "bg-deep-forest hover:bg-forest text-bone",
            },
          }}
        />
      </div>
    </div>
  );
}
