import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SearchHero } from "@/components/search/SearchHero";
import { LandingHero } from "@/components/landing/LandingHero";

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <SearchHero />
      </SignedIn>
      <SignedOut>
        <LandingHero />
      </SignedOut>
    </>
  );
}
