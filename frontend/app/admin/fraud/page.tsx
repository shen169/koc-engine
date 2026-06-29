"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, clearToken, auth } from "@/lib/api";

interface FraudFlag {
  user_id: string;
  total_score: number;
  event_count: number;
  latest_rule: string;
  latest_reason: string;
  latest_at: string;
  risk_label: string;
  user: {
    email: string;
    role: string;
  };
}

interface FraudEvent {
  id: string;
  user_id: string;
  rule: string;
  score: number;
  reason: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

const RISK_COLORS: Record<string, string> = {
  normal: "bg-green-100 text-green-700",
  watch: "bg-yellow-100 text-yellow-700",
  restricted: "bg-orange-100 text-orange-700",
  frozen: "bg-red-100 text-red-700",
};

const RISK_LABELS: Record<string, string> = {
  normal: "🟢 Normal",
  watch: "🟡 Watch",
  restricted: "🟠 Restricted",
  frozen: "🔴 Frozen",
};

export default function AdminFraudPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [flagged, setFlagged] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string>("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    auth.me(token).then((u) => {
      if (u.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setAuthorized(true);
      loadFlags(token);
    }).catch(() => {
      clearToken();
      router.push("/login");
    });
  }, [router]);

  async function loadFlags(token: string) {
    setLoading(true);
    try {
      const data = await api<{ flagged: FraudFlag[]; total: number }>(
        "/api/admin/fraud/flags",
        { token }
      );
      setFlagged(data.flagged || []);
    } catch (e) {
      console.error("Failed to load fraud flags:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(userId: string) {
    setSelectedUser(userId);
    setEventsLoading(true);
    try {
      const data = await api<{ events: FraudEvent[]; risk_score: number; total: number }>(
        `/api/admin/fraud/events/${userId}`,
        { token: getToken()! }
      );
      setEvents(data.events || []);
    } catch (e) {
      console.error("Failed to load events:", e);
    } finally {
      setEventsLoading(false);
    }
  }

  async function handleAction(userId: string, action: string) {
    const note = prompt(`Admin note for ${action}:`);
    if (note === null) return; // cancelled

    setActionLoading(`${userId}:${action}`);
    try {
      await api(`/api/admin/fraud/${userId}/action`, {
        method: "POST",
        body: { action, admin_note: note },
        token: getToken()!,
      });
      // Reload
      await loadFlags(getToken()!);
      if (selectedUser === userId) {
        await loadEvents(userId);
      }
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setActionLoading("");
    }
  }

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🛡️ Fraud Monitor</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Behavioral anomaly detection & risk scoring
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {flagged.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">✅</p>
            <p className="text-gray-400 text-lg">No flagged accounts</p>
            <p className="text-gray-300 text-sm mt-1">All clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Flagged Users Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-semibold text-gray-900">
                    Flagged Accounts ({flagged.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-4 py-3">User</th>
                        <th className="text-left px-4 py-3">Role</th>
                        <th className="text-center px-4 py-3">Risk Score</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-left px-4 py-3">Latest Flag</th>
                        <th className="text-center px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {flagged.map((f) => (
                        <tr
                          key={f.user_id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selectedUser === f.user_id ? "bg-pink-50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => loadEvents(f.user_id)}
                              className="text-left hover:text-pink-600 transition-colors"
                            >
                              <span className="font-medium text-gray-900 text-xs block truncate max-w-[140px]">
                                {f.user.email}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">
                                {f.user_id.slice(0, 12)}...
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                              {f.user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                                f.total_score >= 80
                                  ? "bg-red-100 text-red-700"
                                  : f.total_score >= 60
                                  ? "bg-orange-100 text-orange-700"
                                  : f.total_score >= 30
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {f.total_score}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                RISK_COLORS[f.risk_label] || "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {RISK_LABELS[f.risk_label] || f.risk_label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600 block truncate max-w-[180px]">
                              {f.latest_rule}: {f.latest_reason}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(f.latest_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleAction(f.user_id, "warn")}
                                disabled={actionLoading === `${f.user_id}:warn`}
                                className="text-xs px-2 py-1 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 disabled:opacity-50"
                                title="Send Warning"
                              >
                                ⚠️
                              </button>
                              <button
                                onClick={() => handleAction(f.user_id, "freeze")}
                                disabled={actionLoading === `${f.user_id}:freeze`}
                                className="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                                title="Freeze Account"
                              >
                                🚫
                              </button>
                              <button
                                onClick={() => handleAction(f.user_id, "ban")}
                                disabled={actionLoading === `${f.user_id}:ban`}
                                className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Ban Account"
                              >
                                🔨
                              </button>
                              <button
                                onClick={() => handleAction(f.user_id, "clear")}
                                disabled={actionLoading === `${f.user_id}:clear`}
                                className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                                title="Clear Risk Score"
                              >
                                ✅
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: Event Detail Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {selectedUser ? "Event History" : "Select a user"}
                </h3>

                {!selectedUser ? (
                  <p className="text-sm text-gray-400">
                    Click a user email to view their fraud event history.
                  </p>
                ) : eventsLoading ? (
                  <p className="text-sm text-gray-400">Loading...</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-gray-400">No events found.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {events.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-gray-700">
                            {e.rule}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full font-bold ${
                              e.score > 0
                                ? "text-red-600 bg-red-50"
                                : "text-green-600 bg-green-50"
                            }`}
                          >
                            {e.score > 0 ? "+" : ""}
                            {e.score}
                          </span>
                        </div>
                        <p className="text-gray-500 mb-1 leading-relaxed">
                          {e.reason}
                        </p>
                        <span className="text-gray-400">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
