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
      setMessage({ type: "err", text: "请选择用户并输入金额" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const token = getToken()!;
      await admin.rewardCredits(selectedUserId, amount, note || "Admin 手动充值", token);
      setMessage({ type: "ok", text: `成功为用户充值 ${amount} 点` });
      setAmount(100);
      setNote("");
      // Reload data
      await loadData(token);
    } catch (e: any) {
      setMessage({ type: "err", text: e.message || "充值失败" });
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
          <h1 className="font-extrabold text-zinc-900">💰 积分管理</h1>
        </div>
        <button onClick={() => { clearToken(); router.push("/"); }} className="text-sm text-zinc-400 hover:text-zinc-600">退出</button>
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
            <h2 className="font-extrabold text-zinc-900 mb-4">➕ 手动充值</h2>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">选择用户</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                  required
                >
                  <option value="">-- 选择用户 --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} [{u.role === "koc" ? "KOC" : u.role === "merchant" ? "商家" : u.role}] — 余额: {u.balance} 点
                    </option>
                  ))}
                </select>
              </div>

              {selectedUser && (
                <div className="bg-zinc-50 rounded-xl p-3 text-sm text-zinc-600">
                  当前余额：<span className="font-bold text-zinc-900">{selectedUser.balance} 点</span>
                  <span className="mx-2">→</span>
                  充值后：<span className="font-bold text-emerald-600">{selectedUser.balance + amount} 点</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">充值金额（点）</label>
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
                <label className="block text-sm font-semibold text-zinc-700 mb-2">备注</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="充值原因（可选）"
                  className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold hover:bg-pink-600 transition disabled:opacity-50"
              >
                {submitting ? "充值中..." : `确认充值 ${amount} 点`}
              </button>
            </form>
          </div>

          {/* User Balances */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">👥 用户余额</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-8">暂无用户</p>
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
                        {u.role === "koc" ? "🎬 KOC" : u.role === "merchant" ? "🏢 商家" : u.role}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-extrabold ${u.balance < 30 ? "text-red-500" : "text-emerald-600"}`}>
                        {u.balance}
                      </div>
                      <div className="text-xs text-zinc-400">点</div>
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
