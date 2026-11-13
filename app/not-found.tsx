import Link from "next/link";
import { ArrowLeft, LineChart } from "lucide-react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

/**
 * The 404 page previously linked to /dashboard, /support, /terms and /privacy
 * — none of which exist, so every escape route from the 404 page was another
 * 404. It also positioned its footer absolutely inside a flex column, which
 * overlapped the content on short viewports.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-sunken text-ink">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center animate-fade-in">
          <div className="w-24 h-24 bg-surface-raised rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-ink-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" d="M9 10h.01M15 10h.01M9 16a3 3 0 006 0" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-lg text-ink-muted mt-2">Page not found</p>
          <p className="text-ink-body mt-1">
            The page you are looking for doesn&apos;t exist.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-ink text-ink-inverse rounded-md font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" /> Go Home
            </Link>
            <Link
              href="/market"
              className="px-5 py-2.5 inline-flex items-center justify-center gap-2 bg-surface border border-line-strong text-ink-body rounded-md font-medium hover:bg-surface-raised transition-colors"
            >
              <LineChart className="w-5 h-5" aria-hidden="true" /> Browse the Market
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
