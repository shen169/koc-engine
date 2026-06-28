"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import MatchModal from "@/components/MatchModal";
import { interests, auth, getToken, clearToken } from "@/lib/api";

export default function AdminInterests() {
  const router = useRouter();
  const [mutual, setMutual] = useState<Array<Record<string, unknown>>>([]);
  const [all, setAll] = useState<Array<Record<string, unknown>>>([]);
  const [matchModal, setMatchModal] = useState<{ koc: string; company: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      interests.matches(token).then(setMutual).catch(() => {});
      interests.list(token).then(setAll).catch(() => {});
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  async function doMatch(kocInterestId: string, merchantInterestId: string, kocName: string, company: string) {
    const token = getToken();
    if (!token) return;
    await interests.match(kocInterestId, token);
    await interests.match(merchantInterestId, token);
    setMutual((prev) => prev.filter((m) => m.koc_interest_id !== kocInterestId));
    setMatchModal({ koc: kocName, company });
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {matchModal && <MatchModal kocName={matchModal.koc} companyName={matchModal.company} onClose={() => setMatchModal(null)} />}
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm">
        <Link href="/admin" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Admin</Link>
        <h1 className="font-extrabold text-zinc-900 ml-4">Interest Matching</h1>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="font-extrabold text-zinc-900 mb-4">💚 Mutual Matches ({mutual.length})</h2>
        {mutual.length === 0 ? (
          <div className="text-center py-8 mb-8"><Spark size={32} className="mx-auto opacity-30" /><p className="text-zinc-400 text-sm mt-2">No mutual interest yet.</p></div>
        ) : (
          <div className="space-y-3 mb-8">
            {mutual.map((m) => (
              <div key={m.koc_interest_id as string} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-zinc-900">{m.koc_display_name as string}</span>
                  <span className="text-zinc-400 mx-2">↔</span>
                  <span className="font-bold text-zinc-900">{m.merchant_company as string}</span>
                </div>
                <button onClick={() => doMatch(m.koc_interest_id as string, m.merchant_interest_id as string, m.koc_display_name as string, m.merchant_company as string)}
                  className="btn-brand px-5 py-2 text-sm">⚡ Match</button>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-extrabold text-zinc-900 mb-4">All Interests ({all.length})</h2>
        <div className="space-y-2">
          {all.map((i) => (
            <div key={i.id as string} className="bg-white rounded-xl border border-zinc-100 p-3 flex justify-between items-center text-sm">
              <span className="text-zinc-600"><strong>{i.from_role as string}</strong> → {i.to_type as string} <span className="text-xs text-zinc-400">[{i.status as string}]</span></span>
              <span className="text-xs text-zinc-400">{i.created_at as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
