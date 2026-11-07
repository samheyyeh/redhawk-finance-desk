import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Redhawk Finance Desk",
  description: "Three evidence-linked finance MVPs: spend controls, covenant monitoring and portfolio concentration. Synthetic data only.",
};

const NAV = [
  { href: "/controls", label: "Spend controls", n: "#10" },
  { href: "/covenants", label: "Covenants", n: "#5" },
  { href: "/portfolio", label: "Concentration", n: "#17" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              <span className="text-brand">●</span> Redhawk Finance Desk
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm" aria-label="Main">
              {NAV.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 hover:bg-bg">
                  {l.label} <span className="text-muted">{l.n}</span>
                </Link>
              ))}
            </nav>
            <span className="ml-auto text-xs text-muted">Synthetic data · seed 20261106 · as of 2026-09-30</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-4 text-center text-xs text-muted">
          All records are fictional workshop data. Review signals, not fraud or credit conclusions.
        </footer>
      </body>
    </html>
  );
}
