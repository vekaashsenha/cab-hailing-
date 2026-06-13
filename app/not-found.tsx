import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-ink">
      <SiteHeader />
      <section className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-4 text-center sm:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">Page not found</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold">This route is not available.</h1>
          <p className="mt-4 leading-7 text-ink/70">Return to the homepage to begin a chauffeur booking.</p>
          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded bg-ink px-5 font-semibold text-white transition hover:bg-ember"
          >
            Go home
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
