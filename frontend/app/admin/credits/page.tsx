"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, admin, credits, auth, getToken, clearToken } from "@/lib/api";

export default function AdminCreditsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recharge form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState(100);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [withdrawable, setWithdrawable] = useState(true);

  // Withdrawal management
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState("pending");

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      const user = u as Record<string, unknown>;
      if (user.role !== "admin") { router.push("/dashboard"); return; }
      loadData(token);
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  useEffect(() => {
    const token = getToken();
    if (token) loadWithdrawals(token);
  }, [withdrawalFilter]);

  async function loadData(token: string) {
    try {
      const [userList, txHistory] = await Promise.all([
        admin.users(token),
        credits.history(token),
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      setHistory(Array.isArray(txHistory) ? txHistory : []);
      loadWithdrawals(token);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId || amount <= 0) {
      setMessage({ type: "err", text: "Please select a user and enter an amount" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const token = getToken()!;
      await api("/api/credits/reward", {
        method: "POST",
        body: { user_id: selectedUserId, amount, note: note || "Admin Manual Top Up", withdrawable },
        token,
      });
      setMessage({ type: "ok", text: `Successfully topped up ${amount} pt for user` });
      setAmount(100);
      setNote("");
      // Reload data
      await loadData(token);
    } catch (e: any) {
      setMessage({ type: "err", text: e.message || "Top up failed" });
    } finally {
      setSubmitting(false);
    }
  }

  async function loadWithdrawals(token: string) {
    try {
      const data = await admin.withdrawals(token, withdrawalFilter);
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch {
      // withdrawals may not be available yet
    }
  }

  async function handleProcess(id: string, decision: string) {
    const token = getToken()!;
    const note = decision === "rejected" ? (prompt("Rejection reason:") || "") : "";
    await admin.processWithdrawal(id, decision, note, token);
    await loadWithdrawals(token);
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-zinc-50 text-zinc-400">Loading...</div>;
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Nav */}
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin")} className="text-zinc-400 hover:text-zinc-600 text-sm">
            ← Admin
          </button>
          <h1 className="font-extrabold text-zinc-900">💰 Credits Management</h1>
        </div>
        <button onClick={() => { clearToken(); router.push("/"); }} className="text-sm text-zinc-400 hover:text-zinc-600">Sign Out</button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            message.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-100"
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recharge Form */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">➕ Manual Top Up</h2>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                  required
                >
                  <option value="">-- Select User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} [{u.role === "koc" ? "KOC" : u.role === "merchant" ? "Merchant" : u.role}] — Balance: {u.balance?.total ?? u.balance} pt
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="bg-zinc-50 rounded-xl p-3 text-sm text-zinc-600">
                  Current Balance: <span className="font-bold text-zinc-900">{selectedUser.balance?.total ?? selectedUser.balance} pt</span>
                  <span className="mx-2">→</span>
                  After Top Up: <span className="font-bold text-emerald-600">{(selectedUser.balance?.total ?? selectedUser.balance) + amount} pt</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Top Up Amount (pt)</label>
                <div className="flex gap-2 mb-2">
                  {[50, 100, 200, 500, 1000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAmount(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        amount === n ? "bg-pink-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Top up reason (optional)"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={withdrawable} onChange={(e) => setWithdrawable(e.target.checked)} id="withdrawable" />
                <label htmlFor="withdrawable" className="text-sm text-zinc-600">Withdrawable (can be withdrawn by KOC)</label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold hover:bg-pink-600 transition disabled:opacity-50"
              >
                {submitting ? "Topping Up..." : `Confirm Top Up ${amount} pt`}
              </button>
            </form>
          </div>

          {/* User Balances */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">👥 User Balances</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-8">No users yet</p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`p-3 rounded-xl cursor-pointer transition flex justify-between items-center ${
                      selectedUserId === u.id ? "bg-pink-50 border border-pink-200" : "bg-zinc-50 hover:bg-zinc-100"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{u.email}</div>
                      <div className="text-xs text-zinc-400">
                        {u.role === "koc" ? "🎬 KOC" : u.role === "merchant" ? "🏢 Merchant" : u.role}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${(u.balance?.total ?? u.balance) < 30 ? "text-red-500" : "text-emerald-600"}`}>
                        {u.balance?.total ?? u.balance}
                      </div>
                      <div className="text-xs text-zinc-400">pt</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Withdrawal Management */}
        <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">💸 Withdrawal Management</h2>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {["pending", "paid", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setWithdrawalFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                  withdrawalFilter === s
                    ? "bg-pink-500 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {withdrawals.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-8">No {withdrawalFilter} withdrawals</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-zinc-500">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 font-semibold">Account</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w: any) => (
                    <tr key={w.id} className="border-b border-zinc-50">
                      <td className="py-3 text-zinc-900">{w.user_email || w.user_id}</td>
                      <td className="py-3 font-semibold text-zinc-900">{w.amount} pt</td>
                      <td className="py-3 text-zinc-600">{w.payment_method || "-"}</td>
                      <td className="py-3 text-zinc-600 max-w-[160px] truncate">{w.payment_account || "-"}</td>
                      <td className="py-3 text-zinc-500 text-xs">{w.created_at ? new Date(w.created_at).toLocaleDateString() : "-"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          w.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          w.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleProcess(w.id, "approved")}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleProcess(w.id, "rejected")}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
