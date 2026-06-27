"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spark from "@/components/Spark";
import { getToken } from "@/lib/api";

type KocSlot = Record<string, unknown>;

export default function AdminTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [merchant, setMerchant] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token || !id) return;
    fetch(`http://localhost:8001/api/tasks/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (!r.ok) throw new Error(r.status + "");
      return r.json();
    }).then((data) => {
      setTask(data.task || data);
      setProduct(data.product || null);
      setMerchant(data.merchant || null);
    }).catch(() => setError("Failed to load task"));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Spark size={24} className="opacity-30" />
      </div>
    );
  }

  const slots = task.koc_slots as KocSlot[] || [];
  const statusColors: Record<string, string> = {
    pending: "bg-zinc-100 text-zinc-600",
    assigned: "bg-blue-50 text-blue-700",
    accepted: "bg-amber-50 text-amber-700",
    shipped: "bg-purple-50 text-purple-700",
    received: "bg-cyan-50 text-cyan-700",
    submitted: "bg-orange-50 text-orange-700",
    approved: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
    revision_requested: "bg-yellow-50 text-yellow-700",
    disputed: "bg-red-50 text-red-700",
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <nav className="bg-white border-b border-zinc-100 h-14 flex items-center px-6 shadow-sm gap-4">
        <Link href="/admin/tasks" className="text-pink-500 text-sm font-semibold hover:underline">&larr; Tasks</Link>
        <h1 className="font-extrabold text-zinc-900">{task.product_name as string || "Task"}</h1>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${statusColors[task.task_status as string] || "bg-zinc-50 text-zinc-600"}`}>
          {task.task_status as string}
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Task Info */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">Task Info</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Type</span>
              <p className="font-semibold text-zinc-900 capitalize">{task.task_type as string || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Status</span>
              <p className="font-semibold text-zinc-900 capitalize">{task.task_status as string || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">KOCs Required</span>
              <p className="font-semibold text-zinc-900">{task.koc_required as number || 0}</p>
            </div>
            <div>
              <span className="text-zinc-400">Commission Pool</span>
              <p className="font-semibold text-zinc-900">{task.pledge_merchant as number || 0} pt</p>
            </div>
            <div>
              <span className="text-zinc-400">KOC Pledge</span>
              <p className="font-semibold text-zinc-900">{task.pledge_koc as number || 0} pt</p>
            </div>
            <div>
              <span className="text-zinc-400">Commission</span>
              <p className="font-semibold text-zinc-900">{task.commission as number || 0} pt</p>
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">Product</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Name</span>
              <p className="font-semibold text-zinc-900">{task.product_name as string || (product?.name as string) || "—"}</p>
            </div>
            <div>
              <span className="text-zinc-400">Category</span>
              <p className="font-semibold text-zinc-900">{task.product_category as string || (product?.category as string) || "—"}</p>
            </div>
            {task.product_url && (
              <div className="col-span-2">
                <span className="text-zinc-400">Product URL</span>
                <a
                  href={task.product_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-pink-500 font-medium hover:text-pink-600 underline underline-offset-2 text-sm"
                >
                  {task.product_url as string} ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Merchant Info */}
        {merchant && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <h2 className="font-extrabold text-zinc-900 mb-4">Merchant</h2>
            <div className="text-sm">
              <Link href={`/admin/merchants/${merchant.id}`} className="text-pink-500 font-semibold hover:underline">
                {merchant.company_name as string || "View Merchant"}
              </Link>
              <span className="text-zinc-400 ml-2">· Trust: {merchant.trust_score as number}/100 · ⭐ {(merchant.avg_rating as number)?.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* KOC Slots */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-extrabold text-zinc-900 mb-4">KOC Slots ({slots.length}/{task.koc_required as number})</h2>
          {slots.length === 0 ? (
            <p className="text-zinc-400 text-sm">No KOCs assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {slots.map((slot: KocSlot, i: number) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-zinc-900 text-sm">Slot {i}</span>
                      <span className="text-xs text-zinc-400 ml-2">KOC: {slot.koc_id as string || "—"}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColors[slot.status as string] || "bg-zinc-50 text-zinc-600"}`}>
                      {slot.status as string || "empty"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-zinc-400">
                    <div>Accept: {slot.accepted_at ? new Date(slot.accepted_at as string).toLocaleDateString() : "—"}</div>
                    <div>Ship: {slot.shipped_at ? new Date(slot.shipped_at as string).toLocaleDateString() : "—"}</div>
                    <div>Receive: {slot.received_at ? new Date(slot.received_at as string).toLocaleDateString() : "—"}</div>
                    <div>Submit: {slot.submitted_at ? new Date(slot.submitted_at as string).toLocaleDateString() : "—"}</div>
                  </div>
                  {Boolean(slot.tracking_number) && (
                    <p className="text-xs text-zinc-400 mt-2">Tracking: {slot.tracking_number as string} ({slot.carrier as string || "—"})</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
