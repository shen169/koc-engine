"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { admin, credits, auth, getToken, clearToken } from "@/lib/api";

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

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    auth.me(token).then((u) => {
      if (u.role !== "admin") { router.push("/dashboard"); return; }
      loadData(token);
    }).catch(() => { clearToken(); router.push("/login"); });
  }, [router]);

  async function loadData(token: string) {
    try {
      const [userList, txHistory] = await Promise.all([
        admin.users(token),
        credits.history(token),
      ]);
      setUsers(Array.isArray(userList) ? userList : []);
      setHistory(Array.isArray(txHistory) ? txHistory : []);
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
      await admin.rewardCredits(selectedUserId, amount, note || "Admin Manual Top Up", token);
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
                      {u.email} [{u.role === "koc" ? "KOC" : u.role === "merchant" ? "Merchant" : u.role}] — Balance: {u.balance} pt
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="bg-zinc-50 rounded-xl p-3 text-sm text-zinc-600">
                  Current Balance: <span className="font-bold text-zinc-900">{selectedUser.balance} pt</span>
                  <span className="mx-2">→</span>
                  After Top Up: <span className="font-bold text-emerald-600">{selectedUser.balance + amount} pt</span>
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
                      <div className={`text-lg font-extrabold ${u.balance < 30 ? "text-red-500" : "text-emerald-600"}`}>
                        {u.balance}
                      </div>
                      <div className="text-xs text-zinc-400">pt</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
