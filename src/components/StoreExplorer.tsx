"use client";

import { useMemo, useState } from "react";

export interface StoreCardData {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  productCount: number;
  coverImage: string | null;
  whatsapp: string;
}

interface StoreExplorerProps {
  stores: StoreCardData[];
}

export default function StoreExplorer({ stores }: StoreExplorerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const set = new Set(stores.map((s) => s.category));
    return ["All", ...Array.from(set).sort()];
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => {
      const matchesCategory = category === "All" || s.category === category;
      const matchesQuery =
        q.length === 0 ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [stores, query, category]);

  return (
    <div className="explorer">
      <div className="explorer-controls">
        <label className="search-field">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="sr-only">Search stores</span>
          <input
            type="search"
            placeholder="Search stores, categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="pill-row" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`pill${category === c ? " is-active" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="result-count" role="status">
        {filtered.length === 0
          ? "No stores match your search."
          : `${filtered.length} store${filtered.length === 1 ? "" : "s"} open now`}
      </p>

      {filtered.length > 0 ? (
        <div className="store-grid">
          {filtered.map((s) => (
            <article key={s.id} className="store-card">
              <div className="store-cover">
                {s.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverImage} alt="" loading="lazy" />
                ) : (
                  <span className="store-monogram" aria-hidden="true">
                    {s.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="store-category">{s.category}</span>
              </div>
              <div className="store-body">
                <h3>{s.name}</h3>
                {s.description && <p className="store-desc">{s.description}</p>}
                <p className="store-meta">
                  {s.productCount} product{s.productCount === 1 ? "" : "s"} listed
                </p>
                <a
                  className="btn btn-whatsapp btn-block"
                  href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Hello ${s.name}! I'd like to place an order.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-2.9-1.3-4.8-4.2-5-4.4-.1-.2-1-1.4-1-2.7s.6-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.6.8-.4 1.1.7 1.2 1.6 2 2.8 2.6.3.2.5.1.7-.1l.8-.9c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3 0 .2 0 .6-.1 1.1Z" />
                  </svg>
                  Order on WhatsApp
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Try a different search or category.</p>
          <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setCategory("All"); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}