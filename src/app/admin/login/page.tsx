"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, ApiError, setToken } from "@/lib/adminApi";

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

    try {
      const session = await adminApi.login(email, password);
      setToken(session.token);
      if (typeof window !== "undefined") localStorage.setItem("wm_admin_expires", session.expiresAt);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 && err.retryAfterSeconds
        ? `Too many attempts. Try again in ${err.retryAfterSeconds} seconds.`
        : err instanceof Error ? err.message : "Could not connect to the admin service.");
    } finally { setLoading(false); }
  }

  return (
    <div className="container">
      <h1>Admin login</h1>
      <p className="subtitle">Mall-wide oversight.</p>
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
      </form>
    </div>
  );
}
