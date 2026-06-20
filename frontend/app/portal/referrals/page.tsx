"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function ReferralsPage() {
  const router = useRouter();

  // Role guard — redirect non-KOC users
  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "koc") { router.push(getConsolePath(role || "")); return null; }

  const [code, setCode] = useState("");
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [list, setList] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const token = getToken();
    fetch("http://localhost:8001/api/referrals/code", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setCode(d.referral_code)).catch(() => {});
    fetch("http://localhost:8001/api/referrals/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setStats).catch(() => {});
    fetch("http://localhost:8001/api/referrals", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setList).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar user={null} role="koc" title="Referrals" />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Refer Friends & Earn</h1>

        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6 text-center">
          <p className="text-sm text-slate-500 mb-2">Your Referral Link</p>
          <div className="bg-slate-50 rounded-lg p-3 font-mono text-indigo-600 text-sm break-all">
            /koc/apply?ref={code || "..."}
          </div>
          <p className="text-xs text-slate-400 mt-2">Share this link. Earn +10 pts when they complete their first task.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {(function () {
            const items: Array<[string, number]> = [
              ["Invites", (stats.total_invites as number) || 0],
              ["Joined", (stats.joined as number) || 0],
              ["Completed", (stats.completed as number) || 0],
            ];
            return items.map(([label, val]) => (
              <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                <div className="text-2xl font-bold text-indigo-600">{val}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ));
          })()}
        </div>

        {list.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Referral History</h3>
            {list.map((r) => (
              <div key={r.id as string} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <span className="text-slate-600">{r.referred_email as string || "Pending"}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === "completed" ? "bg-green-100 text-green-700" :
                  r.status === "joined" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}>{r.status as string}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
