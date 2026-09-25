import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="TFM Mall home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" />
            </svg>
          </span>
          <span className="brand-name">
            TFM <span className="brand-accent">Mall</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <Link href="/#stores">Explore stores</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#sell">Sell on TFM</Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <Link href="/merchant/login" className="btn btn-ghost btn-sm">
            Merchant login
          </Link>
          <Link href="/merchant/signup" className="btn btn-primary btn-sm">
            Open a store
          </Link>
        </div>
      </div>
    </header>
  );
}