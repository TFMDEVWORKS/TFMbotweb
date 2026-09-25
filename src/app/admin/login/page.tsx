"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, ApiError, setToken } from "@/lib/adminApi";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    toast.loading("Verifying your credentials…", { id: "admin-login" });

    try {
      const session = await adminApi.login(email, password);
      setToken(session.token);
      if (typeof window !== "undefined") localStorage.setItem("wm_admin_expires", session.expiresAt);
      toast.success("Welcome back", { id: "admin-login" });
      router.push("/admin/dashboard");
    } catch (err) {
      const message = err instanceof ApiError && err.status === 429 && err.retryAfterSeconds
        ? `Too many attempts. Try again in ${err.retryAfterSeconds} seconds.`
        : err instanceof Error ? err.message : "Could not connect to the admin service.";
      setError(message);
      toast.error(message, { id: "admin-login" });
    } finally { setLoading(false); }
  }

  return (
    <div className="admin-login-page">
      <div className="login-ambient ambient-one" /><div className="login-ambient ambient-two" />
      <div className="admin-login-card">
        <div className="login-brand"><span className="admin-brand-mark">W</span><span>WhatsApp<span className="brand-accent">Mall</span><small>ADMIN CONSOLE</small></span></div>
        <div className="login-welcome"><span className="admin-kicker">SECURE ADMIN ACCESS</span><h1>Welcome back.</h1><p>Sign in to manage your marketplace.</p></div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email address</label>
          <input id="admin-email" required type="email" autoComplete="username" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" required type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? <><span className="login-spinner" /> Signing in…</> : <>Sign in to dashboard <span>→</span></>}</button>
        </form>
        <div className="login-security"><span>◇</span> Protected administrator access</div>
      </div>
      <p className="login-copyright">WhatsAppMall <span>·</span> Marketplace operations</p>
    </div>
  );
}
