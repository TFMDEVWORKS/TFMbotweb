import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-name">
            TFM <span className="brand-accent">Mall</span>
          </span>
          <p>Ghana&apos;s stores, one WhatsApp away.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/#stores">Explore</Link>
          <Link href="/merchant/signup">Sell on TFM</Link>
          <Link href="/merchant/login">Merchant login</Link>
          <Link href="/admin/login">Admin</Link>
        </nav>
        <p className="footer-note">© {new Date().getFullYear()} TFM Mall. Made in Ghana.</p>
      </div>
    </footer>
  );
}