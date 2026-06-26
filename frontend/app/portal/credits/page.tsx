"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CoinDrop from "@/components/CoinDrop";
import { credits, getToken, getRole, getConsolePath } from "@/lib/api";
import NavBar from "@/components/NavBar";

export default function CreditsPage() {
  const router = useRouter();

  // Role guard — redirect non-KOC users
  const token = getToken();
  const role = getRole();
  const unauthorized = !token || (role && role !== "koc");

  const [balanceData, setBalanceData] = useState({ total: 0, withdrawable: 0, bonus: 0 });
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [withdrawals, setWithdrawals] = useState<Array<Record<string, unknown>>>([]);
  const [showCoin, setShowCoin] = useState(false);

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("paypal");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  const loadData = () => {
    const t = getToken()!;
    credits.balance(t).then((r) => setBalanceData({ total: (r.total as number) ?? 0, withdrawable: (r.withdrawable as number) ?? 0, bonus: (r.bonus as number) ?? 0 })).catch(() => {});
    credits.history(t).then((list) => {
      setHistory(list as Array<Record<string, unknown>>);
      const recent = (list as Array<Record<string, unknown>>)[0];
      if (recent && (recent.amount as number) > 0) setTimeout(() => setShowCoin(true), 300);
    }).catch(() => {});
    credits.withdrawals(t).then((list) => setWithdrawals(list as Array<Record<string, unknown>>)).catch(() => {});
  };

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (role && role !== "koc") { router.push(getConsolePath(role || "")); return; }
    loadData();
  }, [router, role, token]);

  const handleWithdraw = async () => {
    setWithdrawError("");
    setWithdrawSuccess("");

    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) { setWithdrawError("Please enter a valid amount"); return; }
    if (amount > balanceData.withdrawable) { setWithdrawError("Amount exceeds your withdrawable balance"); return; }
    if (!paymentAccount.trim()) { setWithdrawError("Please enter your payment account"); return; }

    setWithdrawing(true);
    try {
      const t = getToken()!;
      await credits.withdraw({ amount, payment_method: paymentMethod, payment_account: paymentAccount.trim() }, t);
      setWithdrawSuccess(`Withdrawal request for ${amount} pts submitted successfully!`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setPaymentAccount("");
      setPaymentMethod("paypal");
      // Reload data
      loadData();
    } catch (e: unknown) {
      setWithdrawError(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  const closeModal = () => {
    if (!withdrawing) {
      setShowWithdrawModal(false);
      setWithdrawError("");
      setWithdrawAmount("");
      setPaymentAccount("");
      setPaymentMethod("paypal");
    }
  };

  const typeLabel: Record<string, string> = { task_reward: "🎬 Task Reward", referral_reward: "👥 Referral Bonus", manual: "💎 Manual Top-up", admin_adjust: "⚙ Adjustment" };
  const typeColor: Record<string, string> = { task_reward: "text-emerald-600", referral_reward: "text-purple-600", manual: "text-cyan-600", admin_adjust: "text-zinc-600" };

  const withdrawalStatusBadge: Record<string, { label: string; cls: string }> = {
    pending: { label: "⏳ Pending", cls: "bg-amber-100 text-amber-700 border-amber-300" },
    paid: { label: "✅ Paid", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    rejected: { label: "❌ Rejected", cls: "bg-rose-100 text-rose-700 border-rose-300" },
  };

  const paymentLabel: Record<string, string> = { paypal: "PayPal", bank_transfer: "Bank Transfer" };

  if (unauthorized) return null;

  return (
    <div className="min-h-screen bg-orange-50">
      <NavBar user={null} role="koc" title="Credits Center" />
      <div className="max-w-lg mx-auto px-6 py-8">
        {showCoin && <CoinDrop amount={30} />}

        {/* Success toast */}
        {withdrawSuccess && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 font-semibold shadow-sm">
            {withdrawSuccess}
          </div>
        )}

        {/* Dual-bucket Balance Card */}
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-6 mb-6">
          <p className="text-sm text-zinc-500 mb-4 text-center">Available Credits</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Withdrawable */}
            <div>
              <p className="text-2xl font-extrabold text-emerald-600">🟢 {balanceData.withdrawable}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Withdrawable</p>
            </div>
            {/* Bonus */}
            <div>
              <p className="text-2xl font-extrabold text-amber-600">🟡 {balanceData.bonus}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Bonus</p>
            </div>
            {/* Total */}
            <div>
              <p className="text-2xl font-extrabold brand-gradient-text">💰 {balanceData.total}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total</p>
            </div>
          </div>
          {/* Withdrawable explanation */}
          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-1">
            <p className="text-xs text-zinc-400 flex justify-between">
              <span>Withdrawable</span>
              <span className="font-bold text-emerald-600">= Earned credits (can withdraw)</span>
            </p>
            <p className="text-xs text-zinc-400 flex justify-between">
              <span>Bonus</span>
              <span className="font-bold text-amber-600">= Promotional / referral credits</span>
            </p>
            <p className="text-xs text-zinc-400 flex justify-between">
              <span>Total</span>
              <span className="font-bold text-zinc-700">= Withdrawable + Bonus</span>
            </p>
          </div>

          {/* Withdraw button */}
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={balanceData.withdrawable <= 0}
            className="mt-5 w-full py-3 rounded-xl font-extrabold text-base transition-all duration-200
              bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]
              disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed"
          >
            💸 Withdraw
          </button>
        </div>

        {/* Transaction History */}
        <h2 className="font-extrabold text-zinc-900 mb-4">Transaction History</h2>
        {history.length === 0 ? (
          <p className="text-zinc-400 text-sm mb-8">No transactions yet.</p>
        ) : (
          <div className="space-y-2 mb-8">
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

        {/* Withdrawal History */}
        <h2 className="font-extrabold text-zinc-900 mb-4">Withdrawal History</h2>
        {withdrawals.length === 0 ? (
          <p className="text-zinc-400 text-sm">No withdrawals yet.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map((w) => {
              const badge = withdrawalStatusBadge[w.status as string] || { label: w.status as string, cls: "bg-zinc-100 text-zinc-600 border-zinc-300" };
              return (
                <div key={w.id as string} className="bg-white rounded-xl border border-zinc-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-extrabold text-base text-zinc-800">💸 {w.amount as number} pts</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="text-xs text-zinc-400 space-y-0.5">
                    <p>Method: {paymentLabel[w.payment_method as string] || w.payment_method as string}</p>
                    <p>Account: {w.payment_account as string}</p>
                    {w.note ? <p>Note: {w.note as string}</p> : null}
                    <p>{w.created_at as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-lg text-zinc-900 mb-1">💸 Withdraw Credits</h3>
            <p className="text-xs text-zinc-500 mb-5">
              Withdrawable balance: <span className="font-bold text-emerald-600">{balanceData.withdrawable} pts</span>
            </p>

            {withdrawError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 font-semibold">
                {withdrawError}
              </div>
            )}

            {/* Amount */}
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">Amount (pts)</label>
            <input
              type="number"
              min={1}
              max={balanceData.withdrawable}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Max ${balanceData.withdrawable} pts`}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold
                focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                placeholder:text-zinc-400 mb-4"
            />

            {/* Payment Method */}
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold
                focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent mb-4"
            >
              <option value="paypal">PayPal</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

            {/* Payment Account */}
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              {paymentMethod === "paypal" ? "PayPal Email" : "Bank Account Details"}
            </label>
            <input
              type={paymentMethod === "paypal" ? "email" : "text"}
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              placeholder={paymentMethod === "paypal" ? "you@example.com" : "Account name, IBAN / SWIFT / routing number"}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 font-semibold
                focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                placeholder:text-zinc-400 mb-6"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={withdrawing}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm border border-zinc-200 text-zinc-600
                  hover:bg-zinc-50 active:scale-[0.98] transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 py-3 rounded-xl font-extrabold text-sm bg-emerald-500 text-white
                  hover:bg-emerald-600 active:scale-[0.98] transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawing ? "Submitting..." : "Submit Withdrawal Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
