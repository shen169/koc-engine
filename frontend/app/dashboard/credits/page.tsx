"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CoinDrop from "@/components/CoinDrop";
import { credits, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function MerchantCreditsPage() {
  const router = useRouter();

  const token = getToken();
  const role = getRole();
  if (!token) { router.push("/login"); return null; }
  if (role && role !== "merchant") { router.push(getConsolePath(role || "")); return null; }

  const [balanceData, setBalanceData] = useState({ total: 0, withdrawable: 0, bonus: 0 });
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [showCoin, setShowCoin] = useState(false);

  useEffect(() => {
    const token = getToken()!;
    credits.balance(token).then((r) => {
      setBalanceData({ total: r.total, withdrawable: r.withdrawable, bonus: r.bonus });
    }).catch(() => {});
    credits.history(token).then((list) => {
      setHistory(list as Array<Record<string, unknown>>);
      const recent = (list as Array<Record<string, unknown>>)[0];
      if (recent && (recent.amount as number) > 0) setTimeout(() => setShowCoin(true), 300);
    }).catch(() => {});
  }, []);

  const typeLabel: Record<string, string> = {
    task_reward: "Task Reward",
    referral_reward: "Referral Bonus",
    manual: "Manual Top-up",
    admin_adjust: "Adjustment",
    withdrawal: "Withdrawal",
  };
  const typeIcon: Record<string, string> = {
    task_reward: "🎬",
    referral_reward: "👥",
    manual: "💎",
    admin_adjust: "⚙",
    withdrawal: "📤",
  };
  const typeColor: Record<string, string> = {
    task_reward: "text-emerald-600",
    referral_reward: "text-purple-600",
    manual: "text-cyan-600",
    admin_adjust: "text-zinc-600",
    withdrawal: "text-rose-600",
  };

  return (
    <div className="min-h-screen bg-purple-50">
      <NavBar user={null} role="merchant" title="Credits Center" />
      <div className="max-w-lg mx-auto px-6 py-8">
        {showCoin && <CoinDrop amount={30} />}

        {/* Split Balance Card */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 mb-4">
          <p className="text-sm text-zinc-500 mb-4 font-medium">Your Balance</p>

          <div className="space-y-3">
            {/* Withdrawable */}
            <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟢</span>
                <span className="text-sm font-semibold text-emerald-800">Withdrawable</span>
              </div>
              <span className="text-lg font-extrabold text-emerald-700">
                {balanceData.withdrawable.toLocaleString()} pts
              </span>
            </div>

            {/* Bonus */}
            <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟡</span>
                <span className="text-sm font-semibold text-amber-800">Bonus</span>
              </div>
              <span className="text-lg font-extrabold text-amber-700">
                {balanceData.bonus.toLocaleString()} pts
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between bg-purple-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="text-sm font-semibold text-purple-800">Total</span>
              </div>
              <span className="text-lg font-extrabold text-purple-700">
                {balanceData.total.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Balance legend */}
          <div className="mt-4 pt-3 border-t border-zinc-100 space-y-1">
            <p className="text-xs text-zinc-400">
              <span className="text-emerald-600 font-semibold">Withdrawable pts</span> are earned and can be sent to KOCs as content fees.
            </p>
            <p className="text-xs text-zinc-400">
              <span className="text-amber-600 font-semibold">Bonus pts</span> are registration gifts and cannot be transferred.
            </p>
          </div>
        </div>

        {/* Top Up Card */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-sm font-extrabold text-zinc-900 mb-1">Need more pts?</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Contact admin to purchase withdrawable pts for KOC content fees.
              </p>
              <a
                href="mailto:honghuishen24@gmail.com"
                className="inline-block mt-3 text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors"
              >
                honghuishen24@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <h2 className="font-extrabold text-zinc-900 mb-4">Transaction History</h2>
        {history.length === 0 ? (
          <p className="text-zinc-400 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((tx) => {
              const amt = tx.amount as number;
              const txType = tx.type as string;
              const isWithdrawable = tx.withdrawable as boolean;
              return (
                <div key={tx.id as string} className="bg-white rounded-xl border border-zinc-100 p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <span className={`text-sm font-bold ${typeColor[txType] || "text-zinc-600"}`}>
                      {typeIcon[txType] ? `${typeIcon[txType]} ` : ""}{typeLabel[txType] || txType}
                    </span>
                    {isWithdrawable && (
                      <span className="ml-1.5 inline-block text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        withdrawable
                      </span>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {tx.note as string || (tx.created_at as string)}
                    </p>
                  </div>
                  <span className={`font-extrabold text-base ${amt > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {amt > 0 ? "+" : ""}{amt} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
