"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CoinDrop from "@/components/CoinDrop";
import { credits, getToken } from "@/lib/api";

export default function CreditsPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [showCoin, setShowCoin] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    credits.balance(token).then((r) => setBalance(r.balance)).catch(() => {});
    credits.history(token).then((list) => {
      setHistory(list as Array<Record<string, unknown>>);
      // Show coin animation if there's a recent reward
      const recent = (list as Array<Record<string, unknown>>)[0];
      if (recent && (recent.amount as number) > 0) setTimeout(() => setShowCoin(true), 300);
    }).catch(() => {});
  }, []);

  const typeLabel: Record<string, string> = { task_reward: "🎬 Task Reward", referral_reward: "👥 Referral Bonus", manual: "💎 Manual Top-up", admin_adjust: "⚙ Adjustment" };
  const typeColor: Record<string, string> = { task_reward: "text-emerald-600", referral_reward: "text-purple-600", manual: "text-cyan-600", admin_adjust: "text-zinc-600" };

  return (
    <div className="min-h-screen bg-orange-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm">
        <Link href="/portal" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Dashboard</Link>
      </nav>
      <div className="max-w-lg mx-auto px-6 py-8">
        {showCoin && <CoinDrop amount={30} />}

        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-8 text-center mb-6">
          <p className="text-sm text-zinc-500 mb-1">Available Credits</p>
          <p className="text-5xl font-extrabold brand-gradient-text">🪙 {balance}</p>
        </div>

        <h2 className="font-extrabold text-zinc-900 mb-4">Transaction History</h2>
        {history.length === 0 ? (
          <p className="text-zinc-400 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((tx) => (
              <div key={tx.id as string} className="bg-white rounded-xl border border-zinc-100 p-4 flex justify-between items-center shadow-sm">
                <div>
                  <span className={`text-sm font-bold ${typeColor[tx.type as string] || "text-zinc-600"}`}>{typeLabel[tx.type as string] || tx.type as string}</span>
                  <p className="text-xs text-zinc-400 mt-0.5">{tx.note as string || tx.created_at as string}</p>
                </div>
                <span className={`font-extrabold text-base ${(tx.amount as number) > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {(tx.amount as number) > 0 ? "+" : ""}{tx.amount as number} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
