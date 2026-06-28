"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth, getToken, clearToken } from "@/lib/api";
import Spark from "@/components/Spark";

const STAR = "★";

export default function AdminReviews() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      api<Array<Record<string, unknown>>>("/api/reviews", { token })
        .then((data) => setReviews(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  const filtered = minRating > 0
    ? reviews.filter((r) => (r.rating as number) <= minRating)
    : reviews;

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">
          &larr; Admin
        </Link>
        <h1 className="font-extrabold text-zinc-900">⭐ Review Monitor ({reviews.length})</h1>
        <div className="flex gap-1 ml-auto">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setMinRating(minRating === n ? 0 : n)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                minRating === n
                  ? "bg-red-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {n === 0 ? "All" : `≤${n}${STAR}`}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No reviews yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id as string}
                className="bg-white rounded-xl border border-zinc-100 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {r.reviewer_role === "koc" ? "🎬 KOC" : "🏢 Merchant"}
                    </span>
                    <span className="text-zinc-400 text-xs">→</span>
                    <span className="text-sm text-zinc-600">
                      {r.target_id ? (r.target_id as string).slice(0, 10) : "?"}
                    </span>
                    {(r.comment as string) && (
                      <span className="text-xs text-zinc-400 italic">
                        &ldquo;{(r.comment as string).slice(0, 60)}&rdquo;
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Task: {(r.task_id as string)?.slice(0, 8)}{" "}
                    · {r.created_at ? new Date(r.created_at as string).toLocaleDateString() : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-lg font-extrabold ${
                      (r.rating as number) >= 4
                        ? "text-emerald-500"
                        : (r.rating as number) >= 3
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  >
                    {r.rating as number}
                  </span>
                  <span className="text-amber-400">{STAR}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
