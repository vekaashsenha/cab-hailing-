import {
  Award,
  BriefcaseBusiness,
  CarFront,
  Clock,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UsersRound
} from "lucide-react";
import { BookingSearchForm } from "@/components/booking-search-form";
import { FleetPreview } from "@/components/fleet-preview";
import { GoogleMapPreview } from "@/components/google-map-preview";
import { SiteHeader } from "@/components/site-header";

const reasons = [
  {
    title: "Executive comfort",
    copy: "Quiet cabins, polished interiors, and professional pickup etiquette.",
    icon: Award
  },
  {
    title: "Always on time",
    copy: "Smart scheduling and route planning for airport, city, and long-distance trips.",
    icon: Clock
  },
  {
    title: "Clear pricing",
    copy: "See fare estimates upfront before you confirm passenger and payment details.",
    icon: Sparkles
  }
];

const safety = [
  "Background-verified chauffeurs",
  "Sanitized vehicles before every duty",
  "Live trip route readiness",
  "Reservation team follow-up"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-ink">
      <section className="hero-image min-h-[680px] text-white">
        <SiteHeader theme="dark" />
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8 lg:pt-20">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <CarFront className="h-4 w-4 text-gold" />
              Premium cab-hailing and chauffeur service
            </p>
            <h1 className="font-serif text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
              Chauffeur-led rides for every important journey.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
              Book refined airport transfers, business travel, city rides, and outstation journeys with trained chauffeurs and a dedicated reservation team.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm text-white/90">
              <div className="rounded border border-white/20 bg-white/10 p-4 backdrop-blur">
                <MapPinned className="mb-3 h-5 w-5 text-gold" />
                Doorstep pickup
              </div>
              <div className="rounded border border-white/20 bg-white/10 p-4 backdrop-blur">
                <UsersRound className="mb-3 h-5 w-5 text-gold" />
                Trained drivers
              </div>
              <div className="rounded border border-white/20 bg-white/10 p-4 backdrop-blur">
                <BriefcaseBusiness className="mb-3 h-5 w-5 text-gold" />
                Business ready
              </div>
            </div>
          </div>
          <BookingSearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">
              Live service area
            </p>
            <h2 className="mt-2 font-serif text-4xl font-semibold text-ink">
              Route planning at a glance
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-ink/70">
            Plan your journey with real-time route assistance and a smooth chauffeur booking experience.
          </p>
        </div>
        <GoogleMapPreview />
      </section>

      <FleetPreview />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ember">
                Why choose us
              </p>
              <h2 className="mt-2 font-serif text-4xl font-semibold">
                A calmer way to move through the city.
              </h2>
              <p className="mt-5 leading-7 text-ink/70">
                From quick city pickups to outstation journeys, the experience is designed around reliability, comfort, and a human team that stays available.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {reasons.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded border border-ink/10 bg-mist p-6">
                    <Icon className="mb-5 h-7 w-7 text-ember" />
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink/70">{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold">
              <ShieldCheck className="h-4 w-4" />
              Safety and chauffeurs
            </p>
            <h2 className="mt-4 font-serif text-4xl font-semibold">
              Trained professionals, checked vehicles, and careful coordination.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {safety.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded border border-white/10 bg-white/10 p-4">
                <ShieldCheck className="h-5 w-5 flex-none text-gold" />
                <span className="text-sm text-white/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
