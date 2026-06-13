import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export function PageShell({
  eyebrow,
  title,
  copy,
  children
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-ink">
      <SiteHeader />
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-ink/70">{copy}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">{children}</section>
    </main>
  );
}
