"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminApi, ApiError, getToken, setToken } from "@/lib/adminApi";
import toast from "react-hot-toast";

const navigation = [
  { label: "Overview", href: "/admin/dashboard", mark: "O" },
  { label: "Stores & merchants", href: "/admin/stores", mark: "S" },
  { label: "Customers", href: "/admin/customers", mark: "C" },
  { label: "Orders", href: "/admin/orders", mark: "#" },
  { label: "Review & approvals", href: "/admin/review", mark: "R" },
];

export default function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [authError, setAuthError] = useState("");

  const active = navigation.find((item) =>
    item.href === "/admin/dashboard"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  ) ?? navigation[0];

  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      router.replace("/admin/login");
      return () => { alive = false; };
    }
    adminApi.me().then((result) => {
      if (alive) setAdmin(result.admin);
    }).catch((error: unknown) => {
      if (!alive) return;
      if (error instanceof ApiError && error.status === 401) {
        setToken(null);
        router.replace("/admin/login");
      } else {
        setAuthError(error instanceof Error ? error.message : "Could not verify your admin session.");
      }
    });
    return () => { alive = false; };
  }, [router]);

  async function signOut() {
    try { await adminApi.logout(); } catch { /* Always clear local credentials. */ }
    setToken(null);
    toast.success("Signed out");
    router.replace("/admin/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-rail">
        <Link className="admin-brand" href="/admin/dashboard">
          <span className="admin-brand-mark">W</span>
          <span>WhatsApp<span className="brand-accent">Mall</span><small>ADMIN CONSOLE</small></span>
        </Link>
        <div className="rail-caption">WORKSPACE</div>
        <nav className="admin-navigation" aria-label="Admin sections">
          {navigation.map((item) => (
            <Link key={item.href} className={`rail-link ${active.href === item.href ? "is-current" : ""}`} href={item.href} aria-current={active.href === item.href ? "page" : undefined}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="rail-bottom">
          <span className="admin-avatar">{admin?.name?.slice(0, 1).toUpperCase() ?? "A"}</span>
          <span className="admin-user">{admin?.name ?? "Administrator"}<small>{admin?.email ?? "Platform admin"}</small></span>
          <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={signOut}>↗</button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">Workspace <span>/</span> {active.label}</div>
          <div className="admin-top-actions"><span className="live-pill"><i /> Live platform</span></div>
        </header>
        <section className="admin-content">
          {authError && <div className="admin-state-error" role="alert"><div><b>Session could not be verified</b><p>{authError}</p></div><button className="page-btn" onClick={() => window.location.reload()}>Retry</button></div>}
          {children}
          <footer className="admin-footer">WhatsAppMall admin <span>·</span> Marketplace operations</footer>
        </section>
      </main>
    </div>
  );
}
