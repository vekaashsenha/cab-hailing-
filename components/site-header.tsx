import Link from "next/link";
import { CarFront } from "lucide-react";

type SiteHeaderProps = {
  theme?: "light" | "dark";
};

const navItems = [
  { label: "Rides", href: "/rides" },
  { label: "Booking", href: "/booking" },
  { label: "Payment", href: "/payment" }
];

export function SiteHeader({ theme = "light" }: SiteHeaderProps) {
  const isDark = theme === "dark";

  return (
    <header className={isDark ? "text-white" : "border-b border-ink/10 bg-white text-ink"}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded bg-gold text-ink">
            <CarFront className="h-5 w-5" />
          </span>
          <span className="font-serif text-2xl font-semibold">Cab Hailing</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isDark ? "text-white/75 transition hover:text-white" : "text-ink/70 transition hover:text-ink"}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
