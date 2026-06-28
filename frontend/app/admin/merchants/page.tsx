"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, auth, getToken, clearToken } from "@/lib/api";
import Spark from "@/components/Spark";

export default function AdminMerchants() {
  const router = useRouter();
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      api<Array<Record<string, unknown>>>("/api/merchants", { token })
        .then(setList).catch(() => {});
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900">Merchants ({list.length})</h1>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {list.length === 0 ? (
          <div className="text-center py-12">
            <Spark size={32} className="mx-auto opacity-30" />
            <p className="text-zinc-400 text-sm mt-2">No merchants yet. New merchant registrations will appear here.</p>
          </div>
        ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div key={m.id as string} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <Link href={`/admin/merchants/${m.id}`} className="block">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-zinc-900">{m.company_name as string || "Unnamed"}</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {(m.product_categories as string[])?.join(", ") || "No categories"} &middot; {(m.website as string) || "No website"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    ⭐ {(m.avg_rating as number)?.toFixed(1)} &middot; {m.total_collaborations as number} collaborations
                    {m.is_blacklisted ? <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">Blacklisted</span> : null}
                  </p>
                </div>
                <span className="text-xs text-zinc-400">{m.id as string}</span>
              </div>
              </Link>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
