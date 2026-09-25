
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ storeName: "", category: "", whatsappPhone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/merchant/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();

    setLoading(false);
    if (json.status === "error") {
      setError(json.message);
      return;
    }
    router.push("/merchant/dashboard");
  }


  return (
    <div className="container">
      <h1>Open your store</h1>
      <p className="subtitle">Set up your shop on the mall in a couple minutes.</p>
      <form onSubmit={handleSubmit}>
        <label>Store name</label>
        <input required value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />

        <label>Category</label>
        <input required placeholder="fashion, food, electronics..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

        <label>WhatsApp number</label>
        <input required placeholder="+233241234567" value={form.whatsappPhone} onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })} />

        <label>Email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label>Password</label>
        <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create my store"}</button>
      </form>
    </div>
  );
}
