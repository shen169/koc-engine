"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken } from "@/lib/api";
import Spark from "@/components/Spark";

export default function AdminBlacklist() {
  const [entries, setEntries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api<Array<Record<string, unknown>>>("/api/blacklist", { token })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">
          &larr; Admin
        </Link>
        <h1 className="font-extrabold text-zinc-900">🚫 Blacklist ({entries.length})</h1>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No blocked users. Clean slate!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={e.id as string}
                className="bg-white rounded-xl border border-rose-100 p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {e.created_by_role === "koc" ? "🎬 KOC" : e.created_by_role === "merchant" ? "🏢 Merchant" : "🛡️ Admin"}
                    </span>
                    <span className="text-rose-400 text-xs">blocked</span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {e.target_role === "koc" ? "KOC" : "Merchant"}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    By: {(e.created_by_id as string)?.slice(0, 10)} · Target: {(e.target_id as string)?.slice(0, 10)}
                    {(e.reason as string) && (
                      <span className="ml-2 text-zinc-500">Reason: {e.reason as string}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-zinc-400">
                  {e.created_at ? new Date(e.created_at as string).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
